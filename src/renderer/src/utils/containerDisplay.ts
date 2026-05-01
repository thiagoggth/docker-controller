const HIDDEN_STATUS_CONTAINERS = new Set(['docker front', 'docker back']);

function normalizeContainerName(name: string): string {
  return name.toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function shouldHideContainerStatus(name: string): boolean {
  return HIDDEN_STATUS_CONTAINERS.has(normalizeContainerName(name));
}
