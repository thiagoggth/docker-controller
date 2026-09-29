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
    this.ipc.handle(E_IPCChannels.CONTAINERS_LOGS_START, (event, data: StartContainerLogsInput) =>
      this.start(event.sender, 'logs', data),
    );
    this.ipc.handle(E_IPCChannels.CONTAINERS_LOGS_STOP, (event, data: StopContainerStreamInput) =>
      this.stop(event.sender, data, 'logs'),
    );
    this.ipc.handle(
      E_IPCChannels.CONTAINERS_TERMINAL_START,
      (event, data: StartContainerTerminalInput) => this.start(event.sender, 'terminal', data),
    );
    this.ipc.handle(
      E_IPCChannels.CONTAINERS_TERMINAL_STOP,
      (event, data: StopContainerStreamInput) => this.stop(event.sender, data, 'terminal'),
    );
    this.ipc.on(E_IPCChannels.CONTAINERS_TERMINAL_INPUT, (event, data: ContainerTerminalInput) => {
      const session = this.getOwned(event.sender, data?.sessionId, 'terminal');
      if (!session)
        return this.sendTerminalError(event.sender, data?.sessionId, 'Invalid terminal session');
      try {
        this.service.writeTerminal(data.sessionId, data.data);
      } catch (error) {
        this.sendTerminalError(event.sender, data.sessionId, this.errorMessage(error));
      }
    });
    this.ipc.on(
      E_IPCChannels.CONTAINERS_TERMINAL_RESIZE,
      (event, data: ContainerTerminalResizeInput) => {
        const session = this.getOwned(event.sender, data?.sessionId, 'terminal');
        if (!session)
          return this.sendTerminalError(event.sender, data?.sessionId, 'Invalid terminal session');
        try {
          void this.service.resizeTerminal(data.sessionId, data.cols, data.rows).catch((error) => {
            this.sendTerminalError(event.sender, data.sessionId, this.errorMessage(error));
          });
        } catch (error) {
          this.sendTerminalError(event.sender, data.sessionId, this.errorMessage(error));
        }
      },
    );
  }

  public async closeAll(): Promise<void> {
    this.sessions.clear();
    await this.service.closeAll();
  }

  private async start(
    sender: WebContents,
    type: ContainerStreamType,
    data: StartContainerLogsInput | StartContainerTerminalInput,
  ): Promise<ApiResult<ContainerStreamSessionDTO>> {
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
      onClose: () => {
        record.ended = true;
        this.send(
          sender,
          type === 'logs'
            ? E_OnIPCChannels.CONTAINERS_LOGS_ENDED
            : E_OnIPCChannels.CONTAINERS_TERMINAL_EXIT,
          { sessionId },
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
    data: StopContainerStreamInput,
    type: ContainerStreamType,
  ): Promise<ApiResult<ContainerStreamSessionDTO>> {
    const record = this.sessions.get(data?.sessionId);
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
}
