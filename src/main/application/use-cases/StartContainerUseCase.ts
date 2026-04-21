import { IUseCase } from '../IUseCase';
import { IContainerRepository } from '../repositories/IContainerRepository';

export interface StartContainerInput {
  id: string;
}

export class StartContainerUseCase implements IUseCase<StartContainerInput, void> {
  constructor(private readonly repository: IContainerRepository) {}

  async execute(input: StartContainerInput): Promise<void> {
    return this.repository.start(input.id);
  }
}
