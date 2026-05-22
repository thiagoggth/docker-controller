import { DomainError } from './DomainError';

export class CredentialStorageError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'CredentialStorageError';
  }
}
