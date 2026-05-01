import { ContainerController } from '@core/controllers/ContainerController';
import { containerUseCaseFactory } from '../useCases/containerUseCaseFactory';
import { DockerodeService } from '@core/data/services/DockerodeService';

export const containerControllerFactory = (dockerService: DockerodeService) => {
  const {
    listContainersUseCase,
    startContainerUseCase,
    stopContainerUseCase,
    openComposeFolderUseCase,
  } =
    containerUseCaseFactory(dockerService);
  return new ContainerController(
    listContainersUseCase,
    startContainerUseCase,
    stopContainerUseCase,
    openComposeFolderUseCase,
  );
};
