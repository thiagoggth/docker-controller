import { IUseCase } from '@core/application/IUseCase';
import { ICredentialRepository } from '@core/application/repositories/ICredentialRepository';
import { CredentialRecordDTO, SaveCredentialRecordInput } from '@core/shared/dtos/CredentialDTO';

export class SaveCredentialsUseCase implements IUseCase<
  SaveCredentialRecordInput,
  CredentialRecordDTO
> {
  constructor(private readonly repository: ICredentialRepository) {}

  async execute(input: SaveCredentialRecordInput): Promise<CredentialRecordDTO> {
    return this.repository.save(input);
  }
}
