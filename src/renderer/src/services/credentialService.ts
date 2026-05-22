import {
  CredentialRecordDTO,
  CredentialTargetDTO,
  SaveCredentialRecordInput,
} from '@core/shared/dtos/CredentialDTO';
import { E_IPCChannels } from '@core/shared/enums/IPCChannels';

export const credentialService = {
  get: (target: CredentialTargetDTO): CredentialRecordDTO => {
    const result = window.api.sendSync<CredentialRecordDTO>(E_IPCChannels.CREDENTIALS_GET, target);
    return result.data;
  },

  save: (input: SaveCredentialRecordInput): CredentialRecordDTO => {
    const result = window.api.sendSync<CredentialRecordDTO>(E_IPCChannels.CREDENTIALS_SAVE, input);
    return result.data;
  },
};
