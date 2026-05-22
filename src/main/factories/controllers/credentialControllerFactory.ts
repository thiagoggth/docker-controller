import { CredentialController } from '@core/controllers/CredentialController';
import { credentialUseCaseFactory } from '../useCases/credentialUseCaseFactory';

export const credentialControllerFactory = () => {
  const { getCredentialsUseCase, saveCredentialsUseCase } = credentialUseCaseFactory();

  return new CredentialController(getCredentialsUseCase, saveCredentialsUseCase);
};
