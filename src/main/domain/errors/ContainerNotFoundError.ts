import { DomainError } from './DomainError';

export class ContainerNotFoundError extends DomainError {
  constructor(containerId: string) {
    super(`Container not found: ${containerId}`);
    this.name = 'ContainerNotFoundError';
  }
}
