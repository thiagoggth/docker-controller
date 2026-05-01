import { ContainerDTO, ContainerDtoStatus } from '@core/shared/dtos/ContainerDTO';
import { E_IPCChannels, E_OnIPCChannels } from '@core/shared/enums/IPCChannels';
import ApiSendError from '@core/shared/errors/ApiSendError';
import { ContainerAction, ContainerEvent } from '@core/shared/types/EventDockerTypes';
import { create } from 'zustand';

interface ContainerState {
  containers: ContainerDTO[];
  loading: boolean;
  error: string | null;
  dockerAvailable: boolean;
  searchQuery: string;
  statusFilter: ContainerDtoStatus | null;
  fetchContainers: () => Promise<void>;
  startContainer: (id: string) => Promise<void>;
  stopContainer: (id: string) => Promise<void>;
  openComposeFolder: (path: string) => Promise<void>;
  setDockerAvailable: (available: boolean) => void;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (filter: ContainerDtoStatus | null) => void;
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
  dockerAvailable: true,
  searchQuery: '',
  statusFilter: null,

  fetchContainers: async () => {
    set({ loading: true, error: null });
    try {
      const pingResult = window.api.sendSync<{ available: boolean }>(E_IPCChannels.DOCKER_PING, {});
      set({ dockerAvailable: pingResult.data.available });

      if (!pingResult.data.available) {
        set({ loading: false, error: 'Docker daemon is unavailable' });
        return;
      }

      const containers = window.api.sendSync<ContainerDTO[]>(E_IPCChannels.CONTAINERS_LIST, {});

      set({ containers: containers.data, loading: false });
    } catch (error) {
      if (error instanceof ApiSendError) {
        console.error('Error fetching containers:', error.stack);
      }
      console.error('Error fetching containers:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch containers';
      const isDockerUnavailable =
        errorMessage.toLowerCase().includes('docker') ||
        errorMessage.toLowerCase().includes('daemon');
      set({
        error: errorMessage,
        loading: false,
        dockerAvailable: !isDockerUnavailable,
      });
    }
  },

  startContainer: async (id: string) => {
    try {
      window.api.sendSync<void>(E_IPCChannels.CONTAINERS_START, { id });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start container';
      set({ error: errorMessage });
      throw error;
    }
  },

  stopContainer: async (id: string) => {
    try {
      window.api.sendSync<void>(E_IPCChannels.CONTAINERS_STOP, { id });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to stop container';
      set({ error: errorMessage });
      throw error;
    }
  },

  openComposeFolder: async (path: string) => {
    try {
      window.api.sendSync<void>(E_IPCChannels.CONTAINERS_OPEN_COMPOSE_FOLDER, { path });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to open compose folder';
      set({ error: errorMessage });
      throw error;
    }
  },

  setDockerAvailable: (available: boolean) => {
    set({ dockerAvailable: available });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setStatusFilter: (filter: ContainerDtoStatus | null) => {
    set({ statusFilter: filter });
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
