import { ContainerDTO } from '@core/shared/dtos/ContainerDTO';
import { Result } from '@core/shared/types/Result';

export const containerService = {
  list: async (): Promise<ContainerDTO[]> => {
    try {
      return await window.api.containers.list();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch containers');
    }
  },

  start: async (id: string): Promise<Result<void>> => {
    try {
      return await window.api.containers.start(id);
    } catch (error) {
      return {
        data: undefined as never,
        success: false,
        error: [
          {
            propName: 'container',
            message: error instanceof Error ? error.message : 'Failed to start container',
          },
        ],
        message: error instanceof Error ? error.message : 'Failed to start container',
      };
    }
  },

  stop: async (id: string): Promise<Result<void>> => {
    try {
      return await window.api.containers.stop(id);
    } catch (error) {
      return {
        data: undefined as never,
        success: false,
        error: [
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
