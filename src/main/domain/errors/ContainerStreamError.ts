import { DomainError } from './DomainError';

export class ContainerStreamError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'ContainerStreamError';
  }
}
