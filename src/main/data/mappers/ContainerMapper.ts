import { Container } from '@core/domain/entities/Container';
import { ContainerStatus } from '@core/domain/entities/ContainerStatus';
import { ContainerDTO } from '@core/shared/dtos/ContainerDTO';
import Dockerode from 'dockerode';

interface NormalizedPortBinding {
  privatePort: string;
  type: string;
  hostPorts: Set<string>;
}

export class ContainerMapper {
  toDomain(
    containerInfo: Dockerode.ContainerInfo,
    inspectInfo?: Dockerode.ContainerInspectInfo,
  ): Container {
    const id = containerInfo.Id.substring(0, 12);
    const completeId = containerInfo.Id;
    const name = this.extractName(containerInfo.Names);
    const image = containerInfo.Image;
    const status = this.mapStatus(containerInfo.State);
    const ports = this.extractPorts(containerInfo.Ports, inspectInfo);
    const createdAt = new Date(containerInfo.Created * 1000);
    const labels = inspectInfo?.Config?.Labels ?? containerInfo.Labels ?? {};
    const composeProject = this.readLabel(labels, 'com.docker.compose.project');
    const composeConfigPath = this.readLabel(labels, 'com.docker.compose.project.config_files');
    const composeService = this.readLabel(labels, 'com.docker.compose.service');

    return new Container(
      id,
      completeId,
      name,
      image,
      status,
      ports,
      createdAt,
      composeProject,
      composeConfigPath,
      composeService,
    );
  }

  toDTO(container: Container): ContainerDTO {
    return {
      id: container.id,
      completeId: container.completeId,
      name: container.name,
      image: container.image,
      status: container.status,
      ports: container.ports,
      uptime: container.uptime,
      composeProject: container.composeProject,
      composeConfigPath: container.composeConfigPath,
      composeService: container.composeService,
    };
  }

  private extractName(names: string[]): string {
    if (!names || names.length === 0) {
      return '';
    }
    return names[0].replace(/^\//, '');
  }

  private readLabel(labels: Record<string, string>, key: string): string | null {
    const value = labels[key]?.trim();
    return value ? value : null;
  }

  private mapStatus(state: string): ContainerStatus {
    return state.toLowerCase() === 'running' ? 'running' : 'stopped';
  }

  private extractPorts(
    ports: Dockerode.Port[],
    inspectInfo?: Dockerode.ContainerInspectInfo,
  ): string[] {
    const normalizedPorts = new Map<string, NormalizedPortBinding>();

    for (const port of ports ?? []) {
      const binding = this.getOrCreatePortBinding(
        normalizedPorts,
        String(port.PrivatePort),
        port.Type,
      );

      if (port.PublicPort) {
        binding.hostPorts.add(String(port.PublicPort));
      }
    }

    for (const port of Object.keys(inspectInfo?.Config?.ExposedPorts ?? {})) {
      const { privatePort, type } = this.parsePortKey(port);
      this.getOrCreatePortBinding(normalizedPorts, privatePort, type);
    }

    for (const [port, bindings] of Object.entries(inspectInfo?.NetworkSettings?.Ports ?? {})) {
      const { privatePort, type } = this.parsePortKey(port);
      const binding = this.getOrCreatePortBinding(normalizedPorts, privatePort, type);

      for (const exposedBinding of bindings ?? []) {
        if (exposedBinding?.HostPort) {
          binding.hostPorts.add(exposedBinding.HostPort);
        }
      }
    }

    for (const [port, bindings] of Object.entries(inspectInfo?.HostConfig?.PortBindings ?? {})) {
      const { privatePort, type } = this.parsePortKey(port);
      const binding = this.getOrCreatePortBinding(normalizedPorts, privatePort, type);

      for (const exposedBinding of this.normalizeHostBindings(bindings)) {
        if (exposedBinding?.HostPort) {
          binding.hostPorts.add(exposedBinding.HostPort);
        }
      }
    }

    return Array.from(normalizedPorts.values()).flatMap((binding) => this.formatPortBinding(binding));
  }

  private getOrCreatePortBinding(
    normalizedPorts: Map<string, NormalizedPortBinding>,
    privatePort: string,
    type: string,
  ): NormalizedPortBinding {
    const normalizedType = type.toLowerCase();
    const key = `${privatePort}/${normalizedType}`;
    const existingBinding = normalizedPorts.get(key);

    if (existingBinding) {
      return existingBinding;
    }

    const binding: NormalizedPortBinding = {
      privatePort,
      type: normalizedType,
      hostPorts: new Set<string>(),
    };

    normalizedPorts.set(key, binding);
    return binding;
  }

  private parsePortKey(port: string): { privatePort: string; type: string } {
    const [privatePort, type = 'tcp'] = port.split('/');
    return { privatePort, type };
  }

  private normalizeHostBindings(
    bindings: unknown,
  ): Array<{ HostIp?: string; HostPort?: string }> {
    return Array.isArray(bindings) ? bindings : [];
  }

  private formatPortBinding(binding: NormalizedPortBinding): string[] {
    const portLabel = this.formatPortLabel(binding.privatePort, binding.type);

    if (binding.hostPorts.size === 0) {
      return [portLabel];
    }

    return Array.from(binding.hostPorts).map((hostPort) => {
      const hostLabel = this.formatPortLabel(hostPort, binding.type);
      return `${portLabel} -> ${hostLabel}`;
    });
  }

  private formatPortLabel(port: string, type: string): string {
    return type === 'udp' ? `${port}/udp` : port;
  }
}
