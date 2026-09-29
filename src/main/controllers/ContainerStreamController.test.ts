import { IContainerStreamService } from '@core/application/services/IContainerStreamService';
import { E_IPCChannels, E_OnIPCChannels } from '@core/shared/enums/IPCChannels';
import { ContainerStreamCallbacks } from '@core/application/services/IContainerStreamService';
import { ContainerStreamController, IpcRegistrar } from './ContainerStreamController';
import { beforeEach, describe, expect, it, vi } from 'vitest';

class FakeRegistrar implements IpcRegistrar {
  handlers = new Map<string, (event: any, data: any) => Promise<any>>();
  listeners = new Map<string, (event: any, data: any) => void>();
  handle(channel: string, listener: (event: any, data: any) => Promise<any>): void {
    this.handlers.set(channel, listener);
  }
  on(channel: string, listener: (event: any, data: any) => void): void {
    this.listeners.set(channel, listener);
  }
  invoke(
    channel: E_IPCChannels,
    data: any,
    sender = { id: 1, send: vi.fn(), isDestroyed: () => false },
  ): Promise<any> {
    return this.handlers.get(channel)!({ sender }, data);
  }
  send(
    channel: E_IPCChannels,
    data: any,
    sender = { id: 1, send: vi.fn(), isDestroyed: () => false },
  ): void {
    this.listeners.get(channel)!({ sender }, data);
  }
}

describe('ContainerStreamController', () => {
  let ipc: FakeRegistrar;
  let service: IContainerStreamService;
  let callbacks: ContainerStreamCallbacks | undefined;
  let controller: ContainerStreamController;

  beforeEach(() => {
    ipc = new FakeRegistrar();
    callbacks = undefined;
    service = {
      startLogs: vi.fn(async (_sessionId, _containerId, cb) => {
        callbacks = cb;
      }),
      startTerminal: vi.fn(async (_sessionId, _containerId, _cols, _rows, cb) => {
        callbacks = cb;
      }),
      writeTerminal: vi.fn(),
      resizeTerminal: vi.fn(),
      stop: vi.fn(),
      closeAll: vi.fn(),
    };
    controller = new ContainerStreamController(service, ipc);
    controller.register();
  });

  it('starts logs and forwards data and ended events to the owner', async () => {
    const sender = { id: 1, send: vi.fn(), isDestroyed: () => false };
    const result = await ipc.invoke(E_IPCChannels.CONTAINERS_LOGS_START, { id: 'abc' }, sender);
    expect(result).toMatchObject({ success: true, data: { sessionId: expect.any(String) } });
    const sessionId = result.data.sessionId;
    callbacks!.onData('line');
    expect(sender.send).toHaveBeenCalledWith(E_OnIPCChannels.CONTAINERS_LOGS_DATA, {
      sessionId,
      data: 'line',
    });
    callbacks!.onClose();
    expect(sender.send).toHaveBeenCalledWith(E_OnIPCChannels.CONTAINERS_LOGS_ENDED, { sessionId });
  });

  it('forwards terminal data, exit, and errors to the invoking sender', async () => {
    const sender = { id: 7, send: vi.fn(), isDestroyed: () => false };
    const result = await ipc.invoke(
      E_IPCChannels.CONTAINERS_TERMINAL_START,
      { id: 'abc', cols: 80, rows: 24 },
      sender,
    );
    const sessionId = result.data.sessionId;
    callbacks!.onData('prompt');
    callbacks!.onClose();
    callbacks!.onError(new Error('failed'));
    expect(sender.send).toHaveBeenCalledWith(E_OnIPCChannels.CONTAINERS_TERMINAL_DATA, {
      sessionId,
      data: 'prompt',
    });
    expect(sender.send).toHaveBeenCalledWith(E_OnIPCChannels.CONTAINERS_TERMINAL_EXIT, {
      sessionId,
    });
    expect(sender.send).toHaveBeenCalledWith(E_OnIPCChannels.CONTAINERS_TERMINAL_ERROR, {
      sessionId,
      message: 'failed',
    });
  });

  it('rejects another sender from stopping, writing, or resizing an active session', async () => {
    const sender = { id: 1, send: vi.fn(), isDestroyed: () => false };
    const other = { id: 2, send: vi.fn(), isDestroyed: () => false };
    const started = await ipc.invoke(
      E_IPCChannels.CONTAINERS_TERMINAL_START,
      { id: 'abc', cols: 80, rows: 24 },
      sender,
    );
    const sessionId = started.data.sessionId;
    expect(
      (await ipc.invoke(E_IPCChannels.CONTAINERS_TERMINAL_STOP, { sessionId }, other)).success,
    ).toBe(false);
    ipc.send(E_IPCChannels.CONTAINERS_TERMINAL_INPUT, { sessionId, data: 'x' }, other);
    ipc.send(E_IPCChannels.CONTAINERS_TERMINAL_RESIZE, { sessionId, cols: 90, rows: 30 }, other);
    expect(service.stop).not.toHaveBeenCalled();
    expect(service.writeTerminal).not.toHaveBeenCalled();
    expect(service.resizeTerminal).not.toHaveBeenCalled();
    expect(other.send).toHaveBeenCalledWith(
      E_OnIPCChannels.CONTAINERS_TERMINAL_ERROR,
      expect.objectContaining({ sessionId }),
    );
  });

  it('rejects invoke commands when the owner uses the wrong stream type', async () => {
    const sender = { id: 1, send: vi.fn(), isDestroyed: () => false };
    const started = await ipc.invoke(E_IPCChannels.CONTAINERS_LOGS_START, { id: 'abc' }, sender);
    const result = await ipc.invoke(
      E_IPCChannels.CONTAINERS_TERMINAL_STOP,
      { sessionId: started.data.sessionId },
      sender,
    );
    expect(result.success).toBe(false);
    expect(service.stop).not.toHaveBeenCalled();
  });

  it('makes stop idempotent for an already-ended owned session', async () => {
    const sender = { id: 1, send: vi.fn(), isDestroyed: () => false };
    const started = await ipc.invoke(E_IPCChannels.CONTAINERS_LOGS_START, { id: 'abc' }, sender);
    callbacks!.onClose();
    expect(
      (
        await ipc.invoke(
          E_IPCChannels.CONTAINERS_LOGS_STOP,
          { sessionId: started.data.sessionId },
          sender,
        )
      ).success,
    ).toBe(true);
  });

  it('awaits service cleanup for active sessions and clears ownership', async () => {
    const sender = { id: 1, send: vi.fn(), isDestroyed: () => false };
    const started = await ipc.invoke(
      E_IPCChannels.CONTAINERS_TERMINAL_START,
      { id: 'abc', cols: 80, rows: 24 },
      sender,
    );
    let resolveCleanup!: () => void;
    vi.mocked(service.closeAll).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveCleanup = () => {
            callbacks!.onClose();
            resolve();
          };
        }),
    );
    const closing = controller.closeAll();
    let settled = false;
    void closing.then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);
    expect(service.closeAll).toHaveBeenCalledOnce();
    resolveCleanup();
    await closing;
    expect(settled).toBe(true);
    expect(sender.send).toHaveBeenCalledWith(E_OnIPCChannels.CONTAINERS_TERMINAL_EXIT, {
      sessionId: started.data.sessionId,
    });
    ipc.send(
      E_IPCChannels.CONTAINERS_TERMINAL_INPUT,
      { sessionId: started.data.sessionId, data: 'ignored' },
      sender,
    );
    expect(service.writeTerminal).not.toHaveBeenCalled();
  });

  it('clears the provisional owner when start fails', async () => {
    let failedSessionId = '';
    vi.mocked(service.startLogs).mockImplementationOnce(async (sessionId) => {
      failedSessionId = sessionId;
      throw new Error('nope');
    });
    const sender = { id: 1, send: vi.fn(), isDestroyed: () => false };
    const result = await ipc.invoke(E_IPCChannels.CONTAINERS_LOGS_START, { id: 'abc' }, sender);
    expect(result.success).toBe(false);
    const stopped = await ipc.invoke(
      E_IPCChannels.CONTAINERS_LOGS_STOP,
      { sessionId: failedSessionId },
      sender,
    );
    expect(stopped.success).toBe(true);
    expect(service.stop).not.toHaveBeenCalled();
    ipc.send(
      E_IPCChannels.CONTAINERS_TERMINAL_INPUT,
      { sessionId: failedSessionId, data: 'x' },
      sender,
    );
    expect(service.writeTerminal).not.toHaveBeenCalled();
    expect(sender.send).toHaveBeenCalledWith(
      E_OnIPCChannels.CONTAINERS_TERMINAL_ERROR,
      expect.objectContaining({ sessionId: failedSessionId }),
    );
  });

  it.each([
    [E_IPCChannels.CONTAINERS_LOGS_START, {}],
    [E_IPCChannels.CONTAINERS_LOGS_START, { id: '' }],
    [E_IPCChannels.CONTAINERS_LOGS_START, { id: '  ' }],
    [E_IPCChannels.CONTAINERS_TERMINAL_START, { id: 'abc', cols: 0, rows: 24 }],
    [E_IPCChannels.CONTAINERS_TERMINAL_START, { id: 'abc', cols: 80.5, rows: 24 }],
    [E_IPCChannels.CONTAINERS_TERMINAL_START, { id: 'abc', cols: Infinity, rows: 24 }],
    [E_IPCChannels.CONTAINERS_TERMINAL_START, { id: 'abc', cols: 80, rows: -1 }],
    [E_IPCChannels.CONTAINERS_LOGS_STOP, {}],
    [E_IPCChannels.CONTAINERS_TERMINAL_STOP, { sessionId: '' }],
  ])('rejects malformed invoke payloads on %s', async (channel, payload) => {
    const result = await ipc.invoke(channel, payload);
    expect(result.success).toBe(false);
    expect(service.startLogs).not.toHaveBeenCalled();
    expect(service.startTerminal).not.toHaveBeenCalled();
    expect(service.stop).not.toHaveBeenCalled();
  });

  it.each([undefined, {}, { sessionId: '', data: 'x' }, { sessionId: 'session', data: 1 }])(
    'rejects malformed terminal input payloads without writing',
    (payload) => {
      const sender = { id: 1, send: vi.fn(), isDestroyed: () => false };
      ipc.send(E_IPCChannels.CONTAINERS_TERMINAL_INPUT, payload, sender);
      expect(service.writeTerminal).not.toHaveBeenCalled();
      expect(sender.send).toHaveBeenCalledWith(
        E_OnIPCChannels.CONTAINERS_TERMINAL_ERROR,
        expect.objectContaining({ message: expect.any(String) }),
      );
    },
  );

  it.each([
    undefined,
    {},
    { sessionId: 'session', cols: 0, rows: 24 },
    { sessionId: 'session', cols: 80.5, rows: 24 },
    { sessionId: 'session', cols: 80, rows: Infinity },
  ])('rejects malformed terminal resize payloads without resizing', (payload) => {
    const sender = { id: 1, send: vi.fn(), isDestroyed: () => false };
    ipc.send(E_IPCChannels.CONTAINERS_TERMINAL_RESIZE, payload, sender);
    expect(service.resizeTerminal).not.toHaveBeenCalled();
    expect(sender.send).toHaveBeenCalledWith(
      E_OnIPCChannels.CONTAINERS_TERMINAL_ERROR,
      expect.objectContaining({ message: expect.any(String) }),
    );
  });

  it('validates input and resize fields even for an active owned session', async () => {
    const sender = { id: 1, send: vi.fn(), isDestroyed: () => false };
    const started = await ipc.invoke(
      E_IPCChannels.CONTAINERS_TERMINAL_START,
      { id: 'abc', cols: 80, rows: 24 },
      sender,
    );
    const { sessionId } = started.data;
    ipc.send(E_IPCChannels.CONTAINERS_TERMINAL_INPUT, { sessionId, data: 42 }, sender);
    ipc.send(E_IPCChannels.CONTAINERS_TERMINAL_RESIZE, { sessionId, cols: 0, rows: 24 }, sender);
    expect(service.writeTerminal).not.toHaveBeenCalled();
    expect(service.resizeTerminal).not.toHaveBeenCalled();
    expect(sender.send).toHaveBeenCalledWith(
      E_OnIPCChannels.CONTAINERS_TERMINAL_ERROR,
      expect.objectContaining({ sessionId }),
    );
  });
});
