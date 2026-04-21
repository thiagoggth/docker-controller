import { IUseCase } from '../IUseCase';
import { IContainerRepository } from '../repositories/IContainerRepository';
import { Container } from '@core/domain/entities/Container';

export class ListContainersUseCase implements IUseCase<void, Container[]> {
  constructor(private readonly repository: IContainerRepository) {}

  async execute(): Promise<Container[]> {
    return this.repository.listAll();
  }
}
