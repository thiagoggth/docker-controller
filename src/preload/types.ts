import { E_IPCChannels, E_OnIPCChannels } from '@core/shared/enums/IPCChannels';
import { ApiResult } from '@core/shared/types/ApiTypes';

export type RemoveListener = () => void;
export interface IApi {
  sendSync: <T = any>(channel: E_IPCChannels, data: any) => ApiResult<T>;
  on: <T = any>(channel: E_OnIPCChannels, callback: (data: T) => void) => RemoveListener;
}
