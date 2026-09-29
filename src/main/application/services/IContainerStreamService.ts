export interface ContainerStreamCallbacks {
  onData(data: string): void;
  onClose(exitCode?: number | null): void;
  onError(error: Error): void;
}

export interface IContainerStreamService {
  startLogs(
    sessionId: string,
    containerId: string,
    callbacks: ContainerStreamCallbacks,
  ): Promise<void>;
  startTerminal(
    sessionId: string,
    containerId: string,
    cols: number,
    rows: number,
    callbacks: ContainerStreamCallbacks,
  ): Promise<void>;
  writeTerminal(sessionId: string, data: string): void;
  resizeTerminal(sessionId: string, cols: number, rows: number): Promise<void>;
  stop(sessionId: string): Promise<void>;
  closeAll(): Promise<void>;
}
