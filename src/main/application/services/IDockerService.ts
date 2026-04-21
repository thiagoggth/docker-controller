import { ContainerAction, ContainerEvent } from '@core/shared/types/EventDockerTypes';

export interface IDockerService {
  connect(): Promise<void>;
  isConnected(): boolean;
  disconnect(): Promise<void>;
  onContainerEvent(on: ContainerAction[], callback: (event: ContainerEvent) => void): void;
}
