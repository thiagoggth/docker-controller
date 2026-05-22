import { GetCredentialsUseCase } from '@core/application/use-cases/GetCredentialsUseCase';
import { SaveCredentialsUseCase } from '@core/application/use-cases/SaveCredentialsUseCase';
import { SqliteCredentialRepository } from '@core/data/repositories/SqliteCredentialRepository';

let repository: SqliteCredentialRepository | null = null;

export const credentialUseCaseFactory = () => {
  repository ??= new SqliteCredentialRepository();

  const getCredentialsUseCase = new GetCredentialsUseCase(repository);
  const saveCredentialsUseCase = new SaveCredentialsUseCase(repository);

  return {
    getCredentialsUseCase,
    saveCredentialsUseCase,
  };
};
