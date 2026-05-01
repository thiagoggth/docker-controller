import { AppUpdateState } from '@core/shared/types/AppUpdateState';
import { E_IPCChannels, E_OnIPCChannels } from '@core/shared/enums/IPCChannels';
import { create } from 'zustand';

interface UpdateStoreState {
  updateState: AppUpdateState;
  loading: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
  subscribeToUpdates: () => () => void;
}

const initialState: AppUpdateState = {
  status: 'idle',
  version: null,
  releaseName: null,
  releaseNotes: null,
  percent: null,
  transferredBytes: null,
  totalBytes: null,
  bytesPerSecond: null,
  error: null,
};

export const useUpdateStore = create<UpdateStoreState>((set) => ({
  updateState: initialState,
  loading: false,
  error: null,

  hydrate: async () => {
    set({ loading: true, error: null });

    try {
      const response = await window.api.invoke<AppUpdateState>(E_IPCChannels.APP_UPDATE_GET_STATE);
      set({ updateState: response.data, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch update state';
      set({ error: message, loading: false });
    }
  },

  downloadUpdate: async () => {
    set({ error: null });

    try {
      await window.api.invoke<AppUpdateState>(E_IPCChannels.APP_UPDATE_DOWNLOAD);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to download update';
      set({ error: message });
      throw error;
    }
  },

  installUpdate: async () => {
    set({ error: null });

    try {
      await window.api.invoke<AppUpdateState>(E_IPCChannels.APP_UPDATE_INSTALL);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to install update';
      set({ error: message });
      throw error;
    }
  },

  subscribeToUpdates: () => {
    const removeListener = window.api.on<AppUpdateState>(
      E_OnIPCChannels.APP_UPDATE_STATE_CHANGED,
      (updateState) => {
        set({
          updateState,
          error: updateState.status === 'error' ? updateState.error : null,
          loading: false,
        });
      },
    );

    return removeListener;
  },
}));
