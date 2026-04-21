import { ContainerDTO } from '@core/shared/dtos/ContainerDTO';
import { useEffect } from 'react';

export function useAutoReload(enabled: boolean, callback: (dtos: ContainerDTO[]) => void): void {
  useEffect(() => {
    if (!enabled) return;

    // window.api.containers.onUpdated(callback);

    return () => {
      // window.api.containers.offUpdated(callback);
    };
  }, [enabled, callback]);
}
