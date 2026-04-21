import { CheckDockerAvailabilityUseCase } from '@core/application/use-cases/CheckDockerAvailabilityUseCase';
import { E_IPCChannels } from '../shared/enums/IPCChannels';
import { EventAdapter } from './infra/EventAdapter';
import { EventListener } from './infra/EventListener';

export class DockerController {
  private eventListener = new EventListener();
  constructor(private checkAvailabilityUseCase: CheckDockerAvailabilityUseCase) {}

  public register(): void {
    this.dockerPing();
  }

  private dockerPing(): DockerController {
    this.eventListener.on(
      E_IPCChannels.DOCKER_PING,
      EventAdapter.ExecuteEvent(this.checkAvailabilityUseCase, 'Docker status checked'),
    );
    return this;
  }
}
