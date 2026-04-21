import { ElectronAPI } from '@electron-toolkit/preload';
import { IApi } from './types';
declare global {
  interface Window {
    electron: ElectronAPI;
    api: IApi;
  }
}
