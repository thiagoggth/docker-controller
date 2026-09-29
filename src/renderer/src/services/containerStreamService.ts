import { E_IPCChannels } from '@core/shared/enums/IPCChannels';
import {
  ContainerStreamSessionDTO,
  ContainerTerminalInput,
  ContainerTerminalResizeInput,
  StartContainerLogsInput,
  StartContainerTerminalInput,
} from '@core/shared/types/ContainerStreamTypes';

export const containerStreamService = {
  async startLogs(input: StartContainerLogsInput): Promise<ContainerStreamSessionDTO> {
    const result = await window.api.invoke<ContainerStreamSessionDTO>(
      E_IPCChannels.CONTAINERS_LOGS_START,
      input,
    );
    return result.data;
  },

  async stopLogs(sessionId: string): Promise<void> {
    await window.api.invoke<void>(E_IPCChannels.CONTAINERS_LOGS_STOP, { sessionId });
  },

  async startTerminal(input: StartContainerTerminalInput): Promise<ContainerStreamSessionDTO> {
    const result = await window.api.invoke<ContainerStreamSessionDTO>(
      E_IPCChannels.CONTAINERS_TERMINAL_START,
      input,
    );
    return result.data;
  },

  async stopTerminal(sessionId: string): Promise<void> {
    await window.api.invoke<void>(E_IPCChannels.CONTAINERS_TERMINAL_STOP, { sessionId });
  },

  sendTerminalInput(input: ContainerTerminalInput): void {
    window.api.send(E_IPCChannels.CONTAINERS_TERMINAL_INPUT, input);
  },

  resizeTerminal(input: ContainerTerminalResizeInput): void {
    window.api.send(E_IPCChannels.CONTAINERS_TERMINAL_RESIZE, input);
  },
};
