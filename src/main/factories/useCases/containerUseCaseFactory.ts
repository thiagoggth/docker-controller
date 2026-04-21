import { ListContainersUseCase } from '@core/application/use-cases/ListContainersUseCase';
import { StartContainerUseCase } from '@core/application/use-cases/StartContainerUseCase';
import { StopContainerUseCase } from '@core/application/use-cases/StopContainerUseCase';
import { ContainerMapper } from '@core/data/mappers/ContainerMapper';
import { DockerodeContainerRepository } from '@core/data/repositories/DockerodeContainerRepository';
import { DockerodeService } from '@core/data/services/DockerodeService';

export const containerUseCaseFactory = (dockerService: DockerodeService) => {
  const repository = new DockerodeContainerRepository(dockerService, new ContainerMapper());
  const listContainersUseCase = new ListContainersUseCase(repository);
  const startContainerUseCase = new StartContainerUseCase(repository);
  const stopContainerUseCase = new StopContainerUseCase(repository);

  return {
    listContainersUseCase,
    startContainerUseCase,
    stopContainerUseCase,
  };
};
