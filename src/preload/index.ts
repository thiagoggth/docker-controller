import { E_IPCChannels, E_OnIPCChannels } from '@core/shared/enums/IPCChannels';
import ApiSendError from '@core/shared/errors/ApiSendError';
import { ApiResult } from '@core/shared/types/ApiTypes';
import { electronAPI } from '@electron-toolkit/preload';
import { contextBridge, ipcRenderer } from 'electron';
import { IApi } from './types';

// Custom APIs for renderer
const api: IApi = {
  sendSync: <T = any>(channel: E_IPCChannels, data: any): ApiResult<T> => {
    const response: ApiResult<T> = ipcRenderer.sendSync(channel, data);
    if (response.success === false) {
      throw new ApiSendError(
        response.message || 'Unknown error from main process',
        response.errors,
      );
    }
    return response;
  },

  invoke: async <T = any>(channel: E_IPCChannels, data?: any): Promise<ApiResult<T>> => {
    const response: ApiResult<T> = await ipcRenderer.invoke(channel, data);
    if (response.success === false) {
      throw new ApiSendError(
        response.message || 'Unknown error from main process',
        response.errors,
      );
    }
    return response;
  },

  on: <T = any>(channel: E_OnIPCChannels, callback: (data: T) => void) => {
    const fn = (_, data) => callback(data);
    ipcRenderer.on(channel, fn);
    return () => {
      ipcRenderer.removeListener(channel, fn);
    };
  },

  // setInterceptor(interceptorFunction: InterceptorFunction) {
  //   privateInterceptorFunction = interceptorFunction;
  // }
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI;
  // @ts-ignore (define in dts)
  window.api = api;
}
