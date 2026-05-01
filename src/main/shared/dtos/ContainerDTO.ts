export type ContainerDtoStatus = 'running' | 'stopped' | 'die';
export interface ContainerDTO {
  id: string;
  completeId: string;
  name: string;
  image: string;
  status: ContainerDtoStatus;
  ports: string[];
  uptime: string | null;
  composeProject: string | null;
  composeConfigPath: string | null;
  composeService: string | null;
}
