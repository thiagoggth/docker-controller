import { ContainerDTO } from '@core/shared/dtos/ContainerDTO';
import { ApiResult } from '@core/shared/types/ApiTypes';
import { E_IPCChannels } from '@core/shared/enums/IPCChannels';

export const containerService = {
  list: async (): Promise<ContainerDTO[]> => {
    try {
      const result = window.api.sendSync<ContainerDTO[]>(E_IPCChannels.CONTAINERS_LIST, {});
      return result.data;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch containers');
    }
  },

  start: async (id: string): Promise<ApiResult<void>> => {
    try {
      return window.api.sendSync<void>(E_IPCChannels.CONTAINERS_START, { id });
    } catch (error) {
      return {
        data: undefined as never,
        success: false,
        errors: [
          {
            propName: 'container',
            message: error instanceof Error ? error.message : 'Failed to start container',
          },
        ],
        message: error instanceof Error ? error.message : 'Failed to start container',
      };
    }
  },

  stop: async (id: string): Promise<ApiResult<void>> => {
    try {
      return window.api.sendSync<void>(E_IPCChannels.CONTAINERS_STOP, { id });
    } catch (error) {
      return {
        data: undefined as never,
        success: false,
        errors: [
          {
            propName: 'container',
            message: error instanceof Error ? error.message : 'Failed to stop container',
          },
        ],
        message: error instanceof Error ? error.message : 'Failed to stop container',
      };
    }
  },
};
