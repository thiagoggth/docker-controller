import { IUseCase } from '../IUseCase';
import { IContainerRepository } from '../repositories/IContainerRepository';

export interface StopContainerInput {
  id: string;
}

export class StopContainerUseCase implements IUseCase<StopContainerInput, void> {
  constructor(private readonly repository: IContainerRepository) {}

  async execute(input: StopContainerInput): Promise<void> {
    return this.repository.stop(input.id);
  }
}
