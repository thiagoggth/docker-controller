import { IUseCase } from '@core/application/IUseCase';
import { ICredentialRepository } from '@core/application/repositories/ICredentialRepository';
import { CredentialRecordDTO, CredentialTargetDTO } from '@core/shared/dtos/CredentialDTO';

export class GetCredentialsUseCase implements IUseCase<CredentialTargetDTO, CredentialRecordDTO> {
  constructor(private readonly repository: ICredentialRepository) {}

  async execute(input: CredentialTargetDTO): Promise<CredentialRecordDTO> {
    return this.repository.getByTarget(input);
  }
}
