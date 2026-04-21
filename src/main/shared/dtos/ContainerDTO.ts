export interface ContainerDTO {
  id: string;
  name: string;
  image: string;
  status: 'running' | 'stopped';
  ports: string[];
  uptime: string | null;
}
