import { DomainError } from './DomainError';

export class DockerDaemonUnavailableError extends DomainError {
  constructor(message = 'Docker daemon is unavailable') {
    super(message);
    this.name = 'DockerDaemonUnavailableError';
  }
}
