export enum DockerEventType {
  CONTAINER = 'container',
  IMAGE = 'image',
  NETWORK = 'network',
  VOLUME = 'volume',
}

export enum ContainerAction {
  START = 'start',
  STOP = 'stop',
  DIE = 'die',
  RESTART = 'restart',
  KILL = 'kill',
  PAUSE = 'pause',
  UNPAUSE = 'unpause',
}
export interface DockerEvent<TAttributes = Record<string, string>> {
  Type: DockerEventType;
  Action: ContainerAction;
  // id: string;
  time: number;
  timeNano: number;
  Actor: {
    ID: string;
    Attributes: TAttributes;
  };
}

interface ContainerAttributes {
  name: string;
  image?: string;
  [key: string]: string | undefined;
}

export type ContainerEvent = DockerEvent<ContainerAttributes> & {
  Type: DockerEventType.CONTAINER;
  Action: ContainerAction;
};
