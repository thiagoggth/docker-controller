export interface IDockerService {
  connect(): Promise<void>;
  isConnected(): boolean;
  disconnect(): Promise<void>;
}
