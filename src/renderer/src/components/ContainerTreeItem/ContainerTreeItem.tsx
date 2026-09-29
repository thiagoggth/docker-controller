import { ContainerDTO } from '@core/shared/dtos/ContainerDTO';
import { CredentialTargetDTO } from '@core/shared/dtos/CredentialDTO';
import { DockerContainerIcon } from '@gui/components/ContainerIcons/ContainerIcons';
import { shouldHideContainerStatus } from '@gui/utils/containerDisplay';
import { buildContainerCredentialTarget } from '@gui/utils/credentialTarget';
import React from 'react';

interface ContainerTreeItemProps {
  container: ContainerDTO;
  onStart: (id: string) => Promise<void> | void;
  onStop: (id: string) => Promise<void> | void;
  onOpenCredentials: (target: CredentialTargetDTO) => void;
  onOpenLogs: (container: ContainerDTO) => void;
  onOpenTerminal: (container: ContainerDTO) => void;
}

export function ContainerTreeItem({
  container,
  onStart,
  onStop,
  onOpenCredentials,
  onOpenLogs,
  onOpenTerminal,
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

  const handleOpenCredentials = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onOpenCredentials(buildContainerCredentialTarget(container));
  };

  const handleOpenLogs = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onOpenLogs(container);
  };

  const handleOpenTerminal = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onOpenTerminal(container);
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

      <div className="flex shrink-0 items-center gap-2">
        <button
          aria-label={`Logs de ${container.name}`}
          title="Logs"
          className="app-button-outline-primary cursor-pointer rounded px-2.5 py-1 text-xs font-semibold"
          onClick={handleOpenLogs}
          type="button"
        >
          Logs
        </button>
        <button
          aria-label={`Terminal de ${container.name}`}
          title="Terminal"
          className="app-button-outline-primary cursor-pointer rounded px-2.5 py-1 text-xs font-semibold"
          disabled={!isRunning}
          onClick={handleOpenTerminal}
          type="button"
        >
          Terminal
        </button>
        <button
          className="app-button-outline-primary cursor-pointer rounded px-2.5 py-1 text-xs font-semibold transition-colors"
          onClick={handleOpenCredentials}
          type="button"
        >
          Credenciais
        </button>
        <button
          className={`cursor-pointer rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
            isRunning ? 'bg-error text-white hover:bg-error/80' : 'app-button-outline-success'
          }`}
          onClick={handleAction}
          type="button"
        >
          {isRunning ? 'Parar' : 'Iniciar'}
        </button>
      </div>
    </div>
  );
}
