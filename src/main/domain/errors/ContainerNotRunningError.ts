import { DomainError } from './DomainError';

export class ContainerNotRunningError extends DomainError {
  constructor(containerId: string) {
    super(`Container is not running: ${containerId}`);
    this.name = 'ContainerNotRunningError';
  }
}
