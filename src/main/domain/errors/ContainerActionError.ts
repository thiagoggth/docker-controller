import { DomainError } from './DomainError';

export class ContainerActionError extends DomainError {
  constructor(
    public readonly action: string,
    public readonly containerId: string,
    message?: string,
  ) {
    super(message ?? `Failed to ${action} container: ${containerId}`);
    this.name = 'ContainerActionError';
  }
}
