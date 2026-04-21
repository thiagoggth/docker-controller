import { IDockerService } from '@core/application/services/IDockerService';
import { DockerDaemonUnavailableError } from '@core/domain/errors/DockerDaemonUnavailableError';
import {
  ContainerAction,
  ContainerEvent,
  DockerEventType,
} from '@core/shared/types/EventDockerTypes';
import Dockerode from 'dockerode';

export class DockerodeService implements IDockerService {
  private docker: Dockerode | null = null;

  getDocker(): Dockerode {
    if (!this.docker) {
      throw new DockerDaemonUnavailableError(
        'Docker connection not established. Call connect() first.',
      );
    }
    return this.docker;
  }

  async connect(): Promise<void> {
    try {
      this.docker = new Dockerode();
      await this.docker.ping();
    } catch (error) {
      this.docker = null;
      throw new DockerDaemonUnavailableError(
        error instanceof Error ? error.message : 'Docker daemon is unavailable',
      );
    }
  }

  isConnected(): boolean {
    return this.docker !== null;
  }

  async disconnect(): Promise<void> {
    this.docker = null;
  }
  onContainerEvent(on: ContainerAction[], callback: (event: ContainerEvent) => void): void {
    const docker = this.getDocker();
    docker.getEvents(
      {
        filters: {
          type: [DockerEventType.CONTAINER],
          event: on,
        },
      },
      (err, stream) => {
        if (err || !stream) return console.error(err);

        stream.on('data', (chunk) => {
          const event = JSON.parse(chunk.toString()) as ContainerEvent;
          callback(event);
        });
      },
    );
  }
}
