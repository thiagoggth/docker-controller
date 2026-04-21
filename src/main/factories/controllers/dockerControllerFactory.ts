import { DockerController } from '@core/controllers/DockerController';
import { CheckDockerAvailabilityUseCase } from '@core/application/use-cases/CheckDockerAvailabilityUseCase';
import { DockerodeService } from '@core/data/services/DockerodeService';

export const dockerControllerFactory = (dockerService: DockerodeService) => {
  const checkAvailabilityUseCase = new CheckDockerAvailabilityUseCase(dockerService);
  return new DockerController(checkAvailabilityUseCase);
};
