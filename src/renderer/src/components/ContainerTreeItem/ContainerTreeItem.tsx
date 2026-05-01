import { ContainerDTO } from '@core/shared/dtos/ContainerDTO';
import { DockerContainerIcon } from '@gui/components/ContainerIcons/ContainerIcons';
import { shouldHideContainerStatus } from '@gui/utils/containerDisplay';
import React from 'react';

interface ContainerTreeItemProps {
  container: ContainerDTO;
  onStart: (id: string) => Promise<void> | void;
  onStop: (id: string) => Promise<void> | void;
}

export function ContainerTreeItem({
  container,
  onStart,
  onStop,
}: ContainerTreeItemProps): React.JSX.Element {
  const isRunning = container.status === 'running';
  const hideStatus = shouldHideContainerStatus(container.name);
  const shortId = container.id.substring(0, 8);

  const handleAction = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (isRunning) {
      await onStop(container.id);
      return;
    }

    await onStart(container.id);
  };

  return (
    <div className="flex items-center gap-3 rounded border bg-base-200 p-3">
      <div className="app-icon-badge flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
        <DockerContainerIcon className="h-5 w-5" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          {!hideStatus && (
            <div
              className={`h-2 w-2 shrink-0 rounded-full ${isRunning ? 'bg-success' : 'bg-error'}`}
            />
          )}
          <span className="truncate text-sm font-semibold text-base-content">{container.name}</span>
        </div>
        <span className="truncate text-xs text-base-content/70">{container.image}</span>
        <div className="flex flex-wrap items-center gap-x-2 text-xs text-base-content/60">
          <span>ID {shortId}</span>
          {container.ports.length > 0 && (
            <>
              <span>·</span>
              <span>Portas {container.ports.join(', ')}</span>
            </>
          )}
          {!hideStatus && isRunning && container.uptime && (
            <>
              <span>·</span>
              <span>Tempo ativo {container.uptime}</span>
            </>
          )}
          {!hideStatus && !isRunning && (
            <>
              <span>·</span>
              <span>Pronto para iniciar</span>
            </>
          )}
        </div>
      </div>

      <button
        className={`shrink-0 cursor-pointer rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
          isRunning
            ? 'bg-error text-white hover:bg-error/80'
            : 'app-button-outline-success'
        }`}
        onClick={handleAction}
        type="button"
      >
        {isRunning ? 'Parar' : 'Iniciar'}
      </button>
    </div>
  );
}
