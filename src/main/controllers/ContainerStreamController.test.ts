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

  it('makes stop idempotent for ended sessions and clears ownership on closeAll', async () => {
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
    await controller.closeAll();
    expect(service.closeAll).toHaveBeenCalledOnce();
    ipc.send(
      E_IPCChannels.CONTAINERS_TERMINAL_INPUT,
      { sessionId: started.data.sessionId, data: 'ignored' },
      sender,
    );
    expect(service.writeTerminal).not.toHaveBeenCalled();
  });

  it('clears the provisional owner when start fails', async () => {
    vi.mocked(service.startLogs).mockRejectedValueOnce(new Error('nope'));
    const result = await ipc.invoke(E_IPCChannels.CONTAINERS_LOGS_START, { id: 'abc' });
    expect(result.success).toBe(false);
  });
});
