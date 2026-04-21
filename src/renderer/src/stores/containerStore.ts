import { ContainerDTO, ContainerDtoStatus } from '@core/shared/dtos/ContainerDTO';
import { E_IPCChannels, E_OnIPCChannels } from '@core/shared/enums/IPCChannels';
import ApiSendError from '@core/shared/errors/ApiSendError';
import { ContainerAction, ContainerEvent } from '@core/shared/types/EventDockerTypes';
import { create } from 'zustand';

interface ContainerState {
  containers: ContainerDTO[];
  loading: boolean;
  error: string | null;
  fetchContainers: () => Promise<void>;
  startContainer: (id: string) => Promise<void>;
  stopContainer: (id: string) => Promise<void>;
  subscribeToUpdates: () => () => void;
}

function mapEventToStatus(action: ContainerAction): ContainerDtoStatus {
  switch (action) {
    case ContainerAction.START:
      return 'running';
    case ContainerAction.DIE:
      return 'die';
    default:
      return 'stopped';
  }
}

export const useContainerStore = create<ContainerState>((set) => ({
  containers: [],
  loading: false,
  error: null,

  fetchContainers: async () => {
    set({ loading: true, error: null });
    try {
      const containers = window.api.sendSync<ContainerDTO[]>(E_IPCChannels.CONTAINERS_LIST, {});

      set({ containers: containers.data, loading: false });
    } catch (error) {
      if (error instanceof ApiSendError) {
        console.error('Error fetching containers:', error.stack);
      }
      console.error('Error fetching containers:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch containers',
        loading: false,
      });
    }
  },

  startContainer: async (id: string) => {
    const result = window.api.sendSync<{ success: boolean; message?: string }>(
      E_IPCChannels.CONTAINERS_START,
      { id },
    );
    if (!result.success) {
      set({ error: result.message });
    }
  },

  stopContainer: async (id: string) => {
    const result = window.api.sendSync<{ success: boolean; message?: string }>(
      E_IPCChannels.CONTAINERS_STOP,
      { id },
    );
    if (!result.success) {
      set({ error: result.message });
    }
  },

  subscribeToUpdates: () => {
    const handler = (dtos: ContainerEvent) => {
      set((state) => {
        const updatedContainers = state.containers.map((container) =>
          container.completeId === dtos.Actor.ID
            ? {
                ...container,
                status: mapEventToStatus(dtos.Action),
              }
            : container,
        );
        return { containers: updatedContainers };
      });
    };
    const removeListener = window.api.on(E_OnIPCChannels.CONTAINERS_UPDATED, handler);
    return removeListener;
  },
}));
