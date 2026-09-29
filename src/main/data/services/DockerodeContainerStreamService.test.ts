import { PassThrough, Duplex, Writable } from 'node:stream';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DockerodeContainerStreamService } from '@core/data/services/DockerodeContainerStreamService';
import { DockerodeService } from '@core/data/services/DockerodeService';
import { ContainerNotFoundError } from '@core/domain/errors/ContainerNotFoundError';
import { ContainerNotRunningError } from '@core/domain/errors/ContainerNotRunningError';
import { ContainerStreamError } from '@core/domain/errors/ContainerStreamError';
import { ContainerStreamCallbacks } from '@core/application/services/IContainerStreamService';

class TestDuplex extends Duplex {
  readonly writes: Buffer[] = [];
  destroyCalls = 0;

  _read(): void {
    void 0;
  }

  _write(chunk: Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.writes.push(Buffer.from(chunk));
    callback();
  }

  override destroy(error?: Error): this {
    this.destroyCalls += 1;
    return super.destroy(error);
  }
}

const callbacks = (): ContainerStreamCallbacks & {
  data: string[];
  closeCalls: number;
  errors: Error[];
} => {
  const result = {
    data: [] as string[],
    closeCalls: 0,
    errors: [] as Error[],
    onData(data: string) {
      result.data.push(data);
    },
    onClose() {
      result.closeCalls += 1;
    },
    onError(error: Error) {
      result.errors.push(error);
    },
  };
  return result;
};

const dockerFrame = (streamType: number, payload: string): Buffer => {
  const body = Buffer.from(payload);
  const header = Buffer.alloc(8);
  header[0] = streamType;
  header.writeUInt32BE(body.length, 4);
  return Buffer.concat([header, body]);
};

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

const createDocker = ({
  stream = new PassThrough(),
  tty = false,
  running = true,
  logsError,
  execError,
  resizeError,
}: {
  stream?: PassThrough | TestDuplex;
  tty?: boolean;
  running?: boolean;
  logsError?: Error;
  execError?: Error;
  resizeError?: Error;
} = {}) => {
  const exec = {
    start: vi.fn().mockResolvedValue(stream),
    resize: vi.fn().mockImplementation(async () => {
      if (resizeError) throw resizeError;
    }),
  };
  const container = {
    inspect: vi.fn().mockResolvedValue({
      Config: { Tty: tty },
      State: { Running: running },
    }),
    logs: vi.fn().mockImplementation(async () => {
      if (logsError) throw logsError;
      return stream;
    }),
    exec: vi.fn().mockImplementation(async () => {
      if (execError) throw execError;
      return exec;
    }),
  };
  const modem = {
    demuxStream: vi.fn((source: PassThrough, stdout: Writable, stderr: Writable) => {
      let buffered = Buffer.alloc(0);
      source.on('data', (chunk: Buffer) => {
        buffered = Buffer.concat([buffered, chunk]);
        while (buffered.length >= 8) {
          const length = buffered.readUInt32BE(4);
          if (buffered.length < 8 + length) return;

          const target = buffered[0] === 2 ? stderr : stdout;
          target.write(buffered.subarray(8, 8 + length));
          buffered = buffered.subarray(8 + length);
        }
      });
    }),
  };
  Object.assign(container, { modem });
  const docker = {
    getContainer: vi.fn().mockReturnValue(container),
    modem,
  };
  return { docker, container, exec, modem };
};

const createService = (docker: ReturnType<typeof createDocker>) =>
  new DockerodeContainerStreamService({
    getDocker: () => docker.docker,
  } as unknown as DockerodeService);

afterEach(() => vi.restoreAllMocks());

describe('DockerodeContainerStreamService', () => {
  it('starts followed timestamped logs and closes the session once when the stream ends', async () => {
    const stream = new PassThrough();
    const fake = createDocker({ stream, tty: true });
    const service = createService(fake);
    const sink = callbacks();

    await service.startLogs('logs-1', 'container-1', sink);
    stream.write('line one\n');
    stream.end();
    await flush();

    expect(fake.container.logs).toHaveBeenCalledWith({
      stdout: true,
      stderr: true,
      follow: true,
      tail: 200,
      timestamps: true,
    });
    expect(sink.data).toEqual(['line one\n']);
    expect(sink.closeCalls).toBe(1);
  });

  it('forwards ordered stdout and stderr payloads when Docker frames arrive in chunks', async () => {
    const stream = new PassThrough();
    const fake = createDocker({ stream });
    const service = createService(fake);
    const sink = callbacks();

    await service.startLogs('logs-1', 'container-1', sink);
    const frames = Buffer.concat([dockerFrame(1, 'stdout\n'), dockerFrame(2, 'stderr\n')]);
    stream.write(frames.subarray(0, 3));
    stream.write(frames.subarray(3, 12));
    stream.write(frames.subarray(12, 17));
    stream.write(frames.subarray(17));

    expect(fake.modem.demuxStream).toHaveBeenCalledTimes(1);
    expect(fake.modem.demuxStream.mock.calls[0][1]).toBe(fake.modem.demuxStream.mock.calls[0][2]);
    expect(sink.data).toEqual(['stdout\n', 'stderr\n']);
  });

  it('forwards raw TTY log bytes without demultiplexing them', async () => {
    const stream = new PassThrough();
    const fake = createDocker({ stream, tty: true });
    const service = createService(fake);
    const sink = callbacks();
    const ansi = '\u001b[31merror\u001b[0m\n';

    await service.startLogs('logs-1', 'container-1', sink);
    stream.write(ansi);

    expect(fake.modem.demuxStream).not.toHaveBeenCalled();
    expect(sink.data).toEqual([ansi]);
  });

  it('starts a shell terminal, writes input, and resizes the exec session', async () => {
    const stream = new TestDuplex();
    const fake = createDocker({ stream });
    const service = createService(fake);
    const sink = callbacks();

    await service.startTerminal('term-1', 'container-1', 80, 24, sink);
    service.writeTerminal('term-1', 'ls\n');
    await service.resizeTerminal('term-1', 120, 40);

    expect(fake.container.exec).toHaveBeenCalledWith({
      Cmd: ['/bin/sh'],
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,
    });
    expect(fake.exec.start).toHaveBeenCalledWith({ hijack: true, stdin: true });
    expect(fake.exec.resize).toHaveBeenCalledWith({ h: 24, w: 80 });
    expect(Buffer.concat(stream.writes).toString()).toBe('ls\n');
    expect(fake.exec.resize).toHaveBeenLastCalledWith({ h: 40, w: 120 });
  });

  it('destroys the terminal stream and leaves no session when initial resize fails', async () => {
    const stream = new TestDuplex();
    const fake = createDocker({ stream, resizeError: new Error('resize failed') });
    const service = createService(fake);

    await expect(
      service.startTerminal('term-1', 'container-1', 80, 24, callbacks()),
    ).rejects.toThrow('resize failed');

    expect(stream.destroyCalls).toBe(1);
    await expect(service.stop('term-1')).rejects.toBeInstanceOf(ContainerStreamError);
  });

  it('destroys a duplicate stream while preserving the original session', async () => {
    const originalStream = new PassThrough();
    const duplicateStream = new TestDuplex();
    const original = createDocker({ stream: originalStream, tty: true });
    const duplicate = createDocker({ stream: duplicateStream, tty: true });
    let activeDocker = original.docker;
    const service = new DockerodeContainerStreamService({
      getDocker: () => activeDocker,
    } as unknown as DockerodeService);
    const originalSink = callbacks();

    await service.startLogs('logs-1', 'container-1', originalSink);
    activeDocker = duplicate.docker;

    await expect(service.startLogs('logs-1', 'container-2', callbacks())).rejects.toBeInstanceOf(
      ContainerStreamError,
    );
    originalStream.write('still active\n');

    expect(duplicateStream.destroyCalls).toBe(1);
    expect(originalSink.data).toEqual(['still active\n']);
  });

  it('rejects terminal creation for a stopped container', async () => {
    const fake = createDocker({ running: false });
    const service = createService(fake);

    await expect(
      service.startTerminal('term-1', 'container-1', 80, 24, callbacks()),
    ).rejects.toBeInstanceOf(ContainerNotRunningError);
  });

  it('maps a missing Docker container to ContainerNotFoundError', async () => {
    const fake = createDocker({
      logsError: Object.assign(new Error('no such container'), { statusCode: 404 }),
    });
    const service = createService(fake);

    await expect(service.startLogs('logs-1', 'missing', callbacks())).rejects.toBeInstanceOf(
      ContainerNotFoundError,
    );
  });

  it('rejects controls for an unknown session', async () => {
    const service = createService(createDocker());

    expect(() => service.writeTerminal('unknown', 'ls\n')).toThrow(ContainerStreamError);
    await expect(service.resizeTerminal('unknown', 120, 40)).rejects.toBeInstanceOf(
      ContainerStreamError,
    );
    await expect(service.stop('unknown')).rejects.toBeInstanceOf(ContainerStreamError);
  });

  it('reports a stream error once and removes its session', async () => {
    const stream = new PassThrough();
    const fake = createDocker({ stream, tty: true });
    const service = createService(fake);
    const sink = callbacks();

    await service.startLogs('logs-1', 'container-1', sink);
    stream.emit('error', new Error('connection lost'));
    stream.emit('close');
    await flush();

    expect(sink.errors.map((error) => error.message)).toEqual(['connection lost']);
    expect(sink.closeCalls).toBe(0);
    await expect(service.stop('logs-1')).rejects.toBeInstanceOf(ContainerStreamError);
  });

  it('destroys each active stream only once when stopped or closed together', async () => {
    const firstStream = new TestDuplex();
    const secondStream = new TestDuplex();
    const first = createDocker({ stream: firstStream, tty: true });
    const second = createDocker({ stream: secondStream });
    let activeDocker = first.docker;
    const service = new DockerodeContainerStreamService({
      getDocker: () => activeDocker,
    } as unknown as DockerodeService);
    const firstSink = callbacks();
    const secondSink = callbacks();

    await service.startLogs('logs-1', 'container-1', firstSink);
    await service.stop('logs-1');

    activeDocker = second.docker;
    await service.startTerminal('term-1', 'container-2', 80, 24, secondSink);
    await service.closeAll();
    await flush();

    expect(firstStream.destroyCalls).toBe(1);
    expect(secondStream.destroyCalls).toBe(1);
    expect(firstSink.closeCalls).toBe(1);
    expect(secondSink.closeCalls).toBe(1);
  });
});
