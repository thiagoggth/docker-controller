import { Container } from '@core/domain/entities/Container';
import { ContainerStatus } from '@core/domain/entities/ContainerStatus';
import { ContainerDTO } from '@core/shared/dtos/ContainerDTO';
import Dockerode from 'dockerode';

export class ContainerMapper {
  toDomain(containerInfo: Dockerode.ContainerInfo): Container {
    const id = containerInfo.Id.substring(0, 12);
    const name = this.extractName(containerInfo.Names);
    const image = containerInfo.Image;
    const status = this.mapStatus(containerInfo.State);
    const ports = this.extractPorts(containerInfo.Ports);
    const createdAt = new Date(containerInfo.Created * 1000);

    return new Container(id, name, image, status, ports, createdAt);
  }

  toDTO(container: Container): ContainerDTO {
    return {
      id: container.id,
      name: container.name,
      image: container.image,
      status: container.status,
      ports: container.ports,
      uptime: container.uptime,
    };
  }

  private extractName(names: string[]): string {
    if (!names || names.length === 0) {
      return '';
    }
    return names[0].replace(/^\//, '');
  }

  private mapStatus(state: string): ContainerStatus {
    return state.toLowerCase() === 'running' ? 'running' : 'stopped';
  }

  private extractPorts(ports: Dockerode.Port[]): string[] {
    if (!ports || ports.length === 0) {
      return [];
    }
    return ports.map((port) => `${port.PrivatePort}/${port.Type}`);
  }
}
