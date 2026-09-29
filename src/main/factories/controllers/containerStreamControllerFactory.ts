import { DockerodeService } from '@core/data/services/DockerodeService';
import { DockerodeContainerStreamService } from '@core/data/services/DockerodeContainerStreamService';
import { ContainerStreamController } from '@core/controllers/ContainerStreamController';

export function containerStreamControllerFactory(
  dockerService: DockerodeService,
): ContainerStreamController {
  return new ContainerStreamController(new DockerodeContainerStreamService(dockerService));
}
