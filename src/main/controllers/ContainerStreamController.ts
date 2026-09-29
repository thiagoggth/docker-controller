import {
  IContainerStreamService,
  ContainerStreamCallbacks,
} from '@core/application/services/IContainerStreamService';
import { randomUUID } from 'node:crypto';
import { ipcMain, IpcMainEvent, IpcMainInvokeEvent, WebContents } from 'electron';
import { E_IPCChannels, E_OnIPCChannels } from '../shared/enums/IPCChannels';
import {
  ContainerStreamErrorDTO,
  ContainerStreamSessionDTO,
  ContainerStreamType,
  StartContainerLogsInput,
  StartContainerTerminalInput,
  StopContainerStreamInput,
  ContainerTerminalInput,
  ContainerTerminalResizeInput,
} from '../shared/types/ContainerStreamTypes';
import { ApiResult } from '../shared/types/ApiTypes';
import { mapErrorToReports } from './errorMapper';

export interface IpcRegistrar {
  handle(channel: string, listener: (event: IpcMainInvokeEvent, data: any) => Promise<any>): void;
  on(channel: string, listener: (event: IpcMainEvent, data: any) => void): void;
}

type OwnedSession = {
  senderId: number;
  sender: WebContents;
  type: ContainerStreamType;
  ended: boolean;
};

export class ContainerStreamController {
  private readonly sessions = new Map<string, OwnedSession>();

  constructor(
    private readonly service: IContainerStreamService,
    private readonly ipc: IpcRegistrar = ipcMain,
  ) {}

  public register(): void {
    this.ipc.handle(E_IPCChannels.CONTAINERS_LOGS_START, (event, data: unknown) =>
      this.start(event.sender, 'logs', data),
    );
    this.ipc.handle(E_IPCChannels.CONTAINERS_LOGS_STOP, (event, data: unknown) =>
      this.stop(event.sender, data, 'logs'),
    );
    this.ipc.handle(E_IPCChannels.CONTAINERS_TERMINAL_START, (event, data: unknown) =>
      this.start(event.sender, 'terminal', data),
    );
    this.ipc.handle(E_IPCChannels.CONTAINERS_TERMINAL_STOP, (event, data: unknown) =>
      this.stop(event.sender, data, 'terminal'),
    );
    this.ipc.on(E_IPCChannels.CONTAINERS_TERMINAL_INPUT, (event, data: unknown) => {
      if (!this.isTerminalInput(data)) {
        return this.sendTerminalError(
          event.sender,
          this.sessionIdFrom(data),
          'Invalid terminal input payload',
        );
      }
      const session = this.getOwned(event.sender, data.sessionId, 'terminal');
      if (!session)
        return this.sendTerminalError(event.sender, data?.sessionId, 'Invalid terminal session');
      try {
        this.service.writeTerminal(data.sessionId, data.data);
      } catch (error) {
        this.sendTerminalError(event.sender, data.sessionId, this.errorMessage(error));
      }
    });
    this.ipc.on(E_IPCChannels.CONTAINERS_TERMINAL_RESIZE, (event, data: unknown) => {
      if (!this.isTerminalResize(data)) {
        return this.sendTerminalError(
          event.sender,
          this.sessionIdFrom(data),
          'Invalid terminal resize payload',
        );
      }
      const session = this.getOwned(event.sender, data.sessionId, 'terminal');
      if (!session)
        return this.sendTerminalError(event.sender, data?.sessionId, 'Invalid terminal session');
      try {
        void this.service.resizeTerminal(data.sessionId, data.cols, data.rows).catch((error) => {
          this.sendTerminalError(event.sender, data.sessionId, this.errorMessage(error));
        });
      } catch (error) {
        this.sendTerminalError(event.sender, data.sessionId, this.errorMessage(error));
      }
    });
  }

  public async closeAll(): Promise<void> {
    this.sessions.clear();
    await this.service.closeAll();
  }

  private async start(
    sender: WebContents,
    type: ContainerStreamType,
    payload: unknown,
  ): Promise<ApiResult<ContainerStreamSessionDTO>> {
    if (type === 'logs' && !this.isLogsStart(payload)) return this.invalidPayload();
    if (type === 'terminal' && !this.isTerminalStart(payload)) return this.invalidPayload();
    const data = payload as StartContainerLogsInput | StartContainerTerminalInput;
    const sessionId = randomUUID();
    const record: OwnedSession = { senderId: sender.id, sender, type, ended: false };
    this.sessions.set(sessionId, record);
    const callbacks: ContainerStreamCallbacks = {
      onData: (chunk) =>
        this.send(
          sender,
          type === 'logs'
            ? E_OnIPCChannels.CONTAINERS_LOGS_DATA
            : E_OnIPCChannels.CONTAINERS_TERMINAL_DATA,
          { sessionId, data: chunk },
        ),
      onClose: (exitCode) => {
        record.ended = true;
        this.send(
          sender,
          type === 'logs'
            ? E_OnIPCChannels.CONTAINERS_LOGS_ENDED
            : E_OnIPCChannels.CONTAINERS_TERMINAL_EXIT,
          type === 'logs' ? { sessionId } : { sessionId, exitCode: exitCode ?? null },
        );
      },
      onError: (error) => {
        record.ended = true;
        this.send(
          sender,
          type === 'logs'
            ? E_OnIPCChannels.CONTAINERS_LOGS_ERROR
            : E_OnIPCChannels.CONTAINERS_TERMINAL_ERROR,
          { sessionId, message: error.message } satisfies ContainerStreamErrorDTO,
        );
      },
    };
    try {
      if (type === 'logs') {
        await this.service.startLogs(sessionId, data.id, callbacks);
      } else {
        const terminal = data as StartContainerTerminalInput;
        await this.service.startTerminal(
          sessionId,
          terminal.id,
          terminal.cols,
          terminal.rows,
          callbacks,
        );
      }
      return { data: { sessionId }, success: true, message: 'Stream started' };
    } catch (error) {
      this.sessions.delete(sessionId);
      return this.failure(error);
    }
  }

  private async stop(
    sender: WebContents,
    payload: unknown,
    type: ContainerStreamType,
  ): Promise<ApiResult<ContainerStreamSessionDTO>> {
    if (!this.isStop(payload)) return this.invalidPayload();
    const data = payload as StopContainerStreamInput;
    const record = this.sessions.get(data.sessionId);
    if (!record)
      return {
        data: { sessionId: data?.sessionId },
        success: true,
        message: 'Stream already ended',
      };
    if (record.senderId !== sender.id || record.type !== type)
      return this.failure(new Error('Invalid stream ownership or type'));
    if (!record.ended) {
      try {
        await this.service.stop(data.sessionId);
        record.ended = true;
      } catch (error) {
        return this.failure(error);
      }
    }
    this.sessions.delete(data.sessionId);
    return { data: { sessionId: data.sessionId }, success: true, message: 'Stream stopped' };
  }

  private getOwned(
    sender: WebContents,
    sessionId: string,
    type: ContainerStreamType,
  ): OwnedSession | undefined {
    const session = this.sessions.get(sessionId);
    return session && session.senderId === sender.id && session.type === type && !session.ended
      ? session
      : undefined;
  }

  private sendTerminalError(sender: WebContents, sessionId: string, message: string): void {
    this.send(sender, E_OnIPCChannels.CONTAINERS_TERMINAL_ERROR, { sessionId, message });
  }

  private send(sender: WebContents, channel: E_OnIPCChannels, data: unknown): void {
    if (!sender.isDestroyed()) sender.send(channel, data);
  }

  private failure<T = ContainerStreamSessionDTO>(error: unknown): ApiResult<T> {
    const errors = mapErrorToReports(error);
    return {
      data: undefined as T,
      success: false,
      errors,
      message: errors.map(({ message }) => message).join('; '),
    };
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }

  private isPositiveInteger(value: unknown): value is number {
    return (
      typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value > 0
    );
  }

  private isLogsStart(value: unknown): value is StartContainerLogsInput {
    return this.isRecord(value) && this.isNonEmptyString(value.id);
  }

  private isTerminalStart(value: unknown): value is StartContainerTerminalInput {
    return (
      this.isRecord(value) &&
      this.isNonEmptyString(value.id) &&
      this.isPositiveInteger(value.cols) &&
      this.isPositiveInteger(value.rows)
    );
  }

  private isStop(value: unknown): value is StopContainerStreamInput {
    return this.isRecord(value) && this.isNonEmptyString(value.sessionId);
  }

  private isTerminalInput(value: unknown): value is ContainerTerminalInput {
    return (
      this.isRecord(value) &&
      this.isNonEmptyString(value.sessionId) &&
      typeof value.data === 'string'
    );
  }

  private isTerminalResize(value: unknown): value is ContainerTerminalResizeInput {
    return (
      this.isRecord(value) &&
      this.isNonEmptyString(value.sessionId) &&
      this.isPositiveInteger(value.cols) &&
      this.isPositiveInteger(value.rows)
    );
  }

  private sessionIdFrom(value: unknown): string {
    return this.isRecord(value) && typeof value.sessionId === 'string' ? value.sessionId : '';
  }

  private invalidPayload(): ApiResult<ContainerStreamSessionDTO> {
    return this.failure(new Error('Invalid container stream IPC payload'));
  }
}
