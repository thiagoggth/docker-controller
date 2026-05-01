import { ListContainersUseCase } from '@core/application/use-cases/ListContainersUseCase';
import { OpenComposeFolderUseCase } from '@core/application/use-cases/OpenComposeFolderUseCase';
import { StartContainerUseCase } from '@core/application/use-cases/StartContainerUseCase';
import { StopContainerUseCase } from '@core/application/use-cases/StopContainerUseCase';
import { E_IPCChannels } from '../shared/enums/IPCChannels';
import { EventAdapter } from './infra/EventAdapter';
import { EventListener } from './infra/EventListener';

export class ContainerController {
  private eventListener = new EventListener();
  constructor(
    private listUseCase: ListContainersUseCase,
    private startUseCase: StartContainerUseCase,
    private stopUseCase: StopContainerUseCase,
    private openComposeFolderUseCase: OpenComposeFolderUseCase,
  ) {}

  public register(): void {
    this.listContainers().startContainer().stopContainer().openComposeFolder();
  }

  private listContainers(): ContainerController {
    this.eventListener.on(
      E_IPCChannels.CONTAINERS_LIST,
      EventAdapter.ExecuteEvent(this.listUseCase, 'Containers listados com sucesso'),
    );
    return this;
  }

  private startContainer(): ContainerController {
    this.eventListener.on(
      E_IPCChannels.CONTAINERS_START,
      EventAdapter.ExecuteEvent(this.startUseCase, 'Container iniciado com sucesso'),
    );
    return this;
  }

  private stopContainer(): ContainerController {
    this.eventListener.on(
      E_IPCChannels.CONTAINERS_STOP,
      EventAdapter.ExecuteEvent(this.stopUseCase, 'Container parado com sucesso'),
    );
    return this;
  }

  private openComposeFolder(): ContainerController {
    this.eventListener.on(
      E_IPCChannels.CONTAINERS_OPEN_COMPOSE_FOLDER,
      EventAdapter.ExecuteEvent(this.openComposeFolderUseCase, 'Pasta do compose aberta com sucesso'),
    );
    return this;
  }
}
