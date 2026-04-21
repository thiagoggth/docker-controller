import { ContainerController } from '@core/controllers/ContainerController';
import { containerUseCaseFactory } from '../useCases/containerUseCaseFactory';

export const containerControllerFactory = () => {
  const { listContainersUseCase, startContainerUseCase, stopContainerUseCase } =
    containerUseCaseFactory();
  return new ContainerController(
    listContainersUseCase,
    startContainerUseCase,
    stopContainerUseCase,
  );
};
