import { ListContainersUseCase } from '@core/application/use-cases/ListContainersUseCase';
import { StartContainerUseCase } from '@core/application/use-cases/StartContainerUseCase';
import { StopContainerUseCase } from '@core/application/use-cases/StopContainerUseCase';
import { EventAdapter } from './infra/EventAdapter';
import { EventListener } from './infra/EventListener';
import { IPCChannels } from './ipc-channels';

export class ContainerController {
  private eventListener = new EventListener();
  constructor(
    private listUseCase: ListContainersUseCase,
    private startUseCase: StartContainerUseCase,
    private stopUseCase: StopContainerUseCase,
  ) {}

  public register(): void {
    this.listContainers().startContainer().stopContainer();
  }

  private listContainers(): ContainerController {
    this.eventListener.on(
      IPCChannels.CONTAINERS_LIST,
      EventAdapter.ExecuteEvent(this.listUseCase, 'Containers listados com sucesso'),
    );
    return this;
  }

  private startContainer(): ContainerController {
    this.eventListener.on(
      IPCChannels.CONTAINERS_START,
      EventAdapter.ExecuteEvent(this.startUseCase, 'Container iniciado com sucesso'),
    );
    return this;
  }

  private stopContainer(): ContainerController {
    this.eventListener.on(
      IPCChannels.CONTAINERS_STOP,
      EventAdapter.ExecuteEvent(this.stopUseCase, 'Container parado com sucesso'),
    );
    return this;
  }
}
