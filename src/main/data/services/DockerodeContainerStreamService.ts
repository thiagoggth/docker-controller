import {
  IContainerStreamService,
  ContainerStreamCallbacks,
} from '@core/application/services/IContainerStreamService';
import { DockerodeService } from '@core/data/services/DockerodeService';
import { ContainerNotFoundError } from '@core/domain/errors/ContainerNotFoundError';
import { ContainerNotRunningError } from '@core/domain/errors/ContainerNotRunningError';
import { ContainerStreamError } from '@core/domain/errors/ContainerStreamError';
import Dockerode from 'dockerode';
import { Duplex, Readable, Writable } from 'node:stream';

type ContainerStreamSession = {
  stream: Readable | Duplex;
  exec?: Dockerode.Exec;
  finalize(error?: Error, exitCode?: number | null): void;
};

type TerminalStreamSession = ContainerStreamSession & {
  stream: Duplex;
  exec: Dockerode.Exec;
};

export class DockerodeContainerStreamService implements IContainerStreamService {
  private readonly sessions = new Map<string, ContainerStreamSession>();

  constructor(private readonly dockerodeService: DockerodeService) {}

  async startLogs(
    sessionId: string,
    containerId: string,
    callbacks: ContainerStreamCallbacks,
  ): Promise<void> {
    try {
      const container = this.dockerodeService.getDocker().getContainer(containerId);
      const inspection = await container.inspect();
      const stream = (await container.logs({
        stdout: true,
        stderr: true,
        follow: true,
        tail: 200,
        timestamps: true,
      })) as Readable;

      this.addSession(sessionId, stream, callbacks, undefined, inspection.Config.Tty);

      if (inspection.Config.Tty) {
        return;
      }

      const output = this.createOutputSink(callbacks);
      container.modem.demuxStream(stream, output, output);
    } catch (error) {
      throw this.toStreamError(error, containerId);
    }
  }

  async startTerminal(
    sessionId: string,
    containerId: string,
    cols: number,
    rows: number,
    callbacks: ContainerStreamCallbacks,
  ): Promise<void> {
    let stream: Duplex | undefined;
    try {
      const container = this.dockerodeService.getDocker().getContainer(containerId);
      const inspection = await container.inspect();

      if (!inspection.State.Running) {
        throw new ContainerNotRunningError(containerId);
      }

      const exec = await container.exec({
        Cmd: ['/bin/sh'],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true,
      });
      stream = await exec.start({ hijack: true, stdin: true });

      this.addSession(sessionId, stream, callbacks, exec);
      await exec.resize({ h: rows, w: cols });
    } catch (error) {
      const session = stream && this.sessions.get(sessionId);
      if (stream && session?.stream === stream) {
        session.finalize();
        stream.destroy();
      }
      throw this.toStreamError(error, containerId);
    }
  }

  writeTerminal(sessionId: string, data: string): void {
    const session = this.getTerminalSession(sessionId);
    session.stream.write(data);
  }

  async resizeTerminal(sessionId: string, cols: number, rows: number): Promise<void> {
    const session = this.getTerminalSession(sessionId);
    await session.exec!.resize({ h: rows, w: cols });
  }

  async stop(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new ContainerStreamError(`Container stream session not found: ${sessionId}`);
    }

    session.finalize();
    session.stream.destroy();
  }

  async closeAll(): Promise<void> {
    await Promise.all([...this.sessions.keys()].map((sessionId) => this.stop(sessionId)));
  }

  private addSession(
    sessionId: string,
    stream: Readable | Duplex,
    callbacks: ContainerStreamCallbacks,
    exec?: Dockerode.Exec,
    forwardData = true,
  ): void {
    const existingSession = this.sessions.get(sessionId);
    if (existingSession) {
      if (existingSession.stream !== stream) {
        stream.destroy();
      }
      throw new ContainerStreamError(`Container stream session already exists: ${sessionId}`);
    }

    let finalized = false;
    let exitInspectionStarted = false;
    const finalize = (error?: Error, exitCode?: number | null): void => {
      if (finalized) return;

      finalized = true;
      this.sessions.delete(sessionId);
      if (error) {
        callbacks.onError(error);
      } else {
        callbacks.onClose(exitCode);
      }
    };

    this.sessions.set(sessionId, { stream, exec, finalize });
    if (forwardData) {
      stream.on('data', (chunk: Buffer | string) => callbacks.onData(chunk.toString()));
    }
    const handleEnd = () => {
      if (!exec) {
        finalize();
        return;
      }
      if (exitInspectionStarted) return;
      exitInspectionStarted = true;
      void exec
        .inspect()
        .then((inspection) => finalize(undefined, inspection.ExitCode ?? null))
        .catch(() => finalize(undefined, null));
    };
    stream.once('end', handleEnd);
    stream.once('close', handleEnd);
    stream.once('error', (error) => finalize(this.asError(error)));
  }

  private createOutputSink(callbacks: ContainerStreamCallbacks): Writable {
    return new Writable({
      write(chunk, _encoding, callback) {
        callbacks.onData(chunk.toString());
        callback();
      },
    });
  }

  private getTerminalSession(sessionId: string): TerminalStreamSession {
    const session = this.sessions.get(sessionId);
    if (!session?.exec) {
      throw new ContainerStreamError(`Terminal stream session not found: ${sessionId}`);
    }
    return session as TerminalStreamSession;
  }

  private toStreamError(error: unknown, containerId: string): Error {
    if (
      error instanceof ContainerNotFoundError ||
      error instanceof ContainerNotRunningError ||
      error instanceof ContainerStreamError
    ) {
      return error;
    }
    if (this.isNotFoundError(error)) {
      return new ContainerNotFoundError(containerId);
    }
    return new ContainerStreamError(this.asError(error).message);
  }

  private isNotFoundError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;

    const statusCode = (error as { statusCode?: number; json?: { message?: string } }).statusCode;
    const apiMessage = (error as { json?: { message?: string } }).json?.message;
    return (
      error.message.includes('no such container') ||
      error.message.includes('404') ||
      statusCode === 404 ||
      apiMessage === '404'
    );
  }

  private asError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
  }
}
