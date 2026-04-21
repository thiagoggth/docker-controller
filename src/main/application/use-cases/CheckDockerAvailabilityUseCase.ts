import { IDockerService } from '@core/application/services/IDockerService';

export class CheckDockerAvailabilityUseCase {
  constructor(private dockerService: IDockerService) {}

  async execute(): Promise<{ available: boolean }> {
    return { available: this.dockerService.isConnected() };
  }
}
