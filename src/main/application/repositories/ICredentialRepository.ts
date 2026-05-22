import {
  CredentialRecordDTO,
  CredentialTargetDTO,
  SaveCredentialRecordInput,
} from '@core/shared/dtos/CredentialDTO';

export interface ICredentialRepository {
  getByTarget(target: CredentialTargetDTO): CredentialRecordDTO;
  save(input: SaveCredentialRecordInput): CredentialRecordDTO;
}
