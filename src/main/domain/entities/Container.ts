import { ContainerStatus } from './ContainerStatus';

export class Container {
  constructor(
    public readonly id: string,
    public readonly completeId: string,
    public readonly name: string,
    public readonly image: string,
    public readonly status: ContainerStatus,
    public readonly ports: string[],
    public readonly createdAt: Date,
  ) {}

  get uptime(): string | null {
    if (this.status !== 'running') return null;
    const diff = Date.now() - this.createdAt.getTime();
    return formatDuration(diff);
  }
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (parts.length === 0 || seconds > 0) parts.push(`${seconds}s`);

  return parts.join(' ');
}
