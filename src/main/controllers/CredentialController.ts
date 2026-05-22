import { GetCredentialsUseCase } from '@core/application/use-cases/GetCredentialsUseCase';
import { SaveCredentialsUseCase } from '@core/application/use-cases/SaveCredentialsUseCase';
import { E_IPCChannels } from '@core/shared/enums/IPCChannels';
import { EventAdapter } from './infra/EventAdapter';
import { EventListener } from './infra/EventListener';

export class CredentialController {
  private eventListener = new EventListener();

  constructor(
    private readonly getCredentialsUseCase: GetCredentialsUseCase,
    private readonly saveCredentialsUseCase: SaveCredentialsUseCase,
  ) {}

  public register(): void {
    this.getCredentials().saveCredentials();
  }

  private getCredentials(): CredentialController {
    this.eventListener.on(
      E_IPCChannels.CREDENTIALS_GET,
      EventAdapter.ExecuteEvent(this.getCredentialsUseCase, 'Credenciais carregadas com sucesso'),
    );
    return this;
  }

  private saveCredentials(): CredentialController {
    this.eventListener.on(
      E_IPCChannels.CREDENTIALS_SAVE,
      EventAdapter.ExecuteEvent(this.saveCredentialsUseCase, 'Credenciais salvas com sucesso'),
    );
    return this;
  }
}
