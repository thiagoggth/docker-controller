import { ContainerActionError } from '@core/domain/errors/ContainerActionError';
import { ContainerNotFoundError } from '@core/domain/errors/ContainerNotFoundError';
import { DockerDaemonUnavailableError } from '@core/domain/errors/DockerDaemonUnavailableError';
import { DomainError } from '@core/domain/errors/DomainError';
import { Report } from '@core/shared/types/ApiTypes';

export function mapErrorToReports(error: unknown): Report[] {
  if (error instanceof ContainerNotFoundError) {
    return [{ propName: 'container', message: error.message }];
  }

  if (error instanceof ContainerActionError) {
    return [{ propName: error.action, message: error.message }];
  }

  if (error instanceof DockerDaemonUnavailableError) {
    return [{ propName: 'docker', message: error.message }];
  }

  if (error instanceof DomainError) {
    return [{ propName: 'domain', message: error.message }];
  }

  return [{ propName: 'unknown', message: 'An unexpected error occurred' }];
}
