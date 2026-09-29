export type ContainerStreamType = 'logs' | 'terminal';

export type ContainerStreamSessionDTO = { sessionId: string };

export type ContainerTerminalExitDTO = { sessionId: string; exitCode: number | null };

export type ContainerStreamDataDTO = { sessionId: string; data: string };

export type ContainerStreamErrorDTO = { sessionId: string; message: string };

export type StartContainerLogsInput = { id: string };

export type StartContainerTerminalInput = { id: string; cols: number; rows: number };

export type ContainerTerminalInput = { sessionId: string; data: string };

export type ContainerTerminalResizeInput = { sessionId: string; cols: number; rows: number };

export type StopContainerStreamInput = { sessionId: string };
