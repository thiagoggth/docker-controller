import { ContainerDTO } from '@core/shared/dtos/ContainerDTO';
import { CredentialTargetDTO } from '@core/shared/dtos/CredentialDTO';

function normalizeTargetPart(value: string | null | undefined): string {
  return value?.trim() || 'unknown';
}

export function buildContainerCredentialTarget(container: ContainerDTO): CredentialTargetDTO {
  if (container.composeProject && container.composeConfigPath) {
    const service = normalizeTargetPart(container.composeService || container.name);

    return {
      targetKey: [
        'compose-container',
        normalizeTargetPart(container.composeConfigPath),
        normalizeTargetPart(container.composeProject),
        service,
      ].join(':'),
      targetType: 'compose_container',
      displayName: container.name,
    };
  }

  return {
    targetKey: `container:${normalizeTargetPart(container.name)}`,
    targetType: 'container',
    displayName: container.name,
  };
}

export function buildComposeGroupCredentialTarget(
  project: string,
  configPath: string,
): CredentialTargetDTO {
  return {
    targetKey: [
      'compose-group',
      normalizeTargetPart(configPath),
      normalizeTargetPart(project),
    ].join(':'),
    targetType: 'compose_group',
    displayName: project,
  };
}
