import { IContainerRepository } from '@core/application/repositories/IContainerRepository';
import { Container } from '@core/domain/entities/Container';
import { ContainerNotFoundError } from '@core/domain/errors/ContainerNotFoundError';
import { DockerDaemonUnavailableError } from '@core/domain/errors/DockerDaemonUnavailableError';
import { ContainerMapper } from '@core/data/mappers/ContainerMapper';
import { DockerodeService } from '@core/data/services/DockerodeService';

export class DockerodeContainerRepository implements IContainerRepository {
  constructor(
    private readonly dockerodeService: DockerodeService,
    private readonly mapper: ContainerMapper = new ContainerMapper(),
  ) {}

  async listAll(): Promise<Container[]> {
    try {
      const docker = this.dockerodeService.getDocker();
      const containers = await docker.listContainers({ all: true });
      return containers.map((c) => this.mapper.toDomain(c));
    } catch (error) {
      if (error instanceof DockerDaemonUnavailableError) {
        throw error;
      }
      throw new DockerDaemonUnavailableError(
        error instanceof Error ? error.message : 'Failed to list containers',
      );
    }
  }

  async start(id: string): Promise<void> {
    try {
      const docker = this.dockerodeService.getDocker();
      const container = docker.getContainer(id);
      await container.start();
    } catch (error) {
      if (error instanceof DockerDaemonUnavailableError) {
        throw error;
      }
      if (this.isNotFoundError(error)) {
        throw new ContainerNotFoundError(id);
      }
      throw new DockerDaemonUnavailableError(
        error instanceof Error ? error.message : `Failed to start container: ${id}`,
      );
    }
  }

  async stop(id: string): Promise<void> {
    try {
      const docker = this.dockerodeService.getDocker();
      const container = docker.getContainer(id);
      await container.stop();
    } catch (error) {
      if (error instanceof DockerDaemonUnavailableError) {
        throw error;
      }
      if (this.isNotFoundError(error)) {
        throw new ContainerNotFoundError(id);
      }
      throw new DockerDaemonUnavailableError(
        error instanceof Error ? error.message : `Failed to stop container: ${id}`,
      );
    }
  }

  private isNotFoundError(error: unknown): boolean {
    if (error instanceof Error) {
      const statusCode = (error as any).statusCode ?? (error as any).json?.message;
      return (
        error.message.includes('no such container') ||
        error.message.includes('404') ||
        statusCode === 404
      );
    }
    return false;
  }
}
