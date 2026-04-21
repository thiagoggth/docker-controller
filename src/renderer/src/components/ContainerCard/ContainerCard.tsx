import { ContainerDTO } from '@core/shared/dtos/ContainerDTO';
import React from 'react';

interface ContainerCardProps {
  container: ContainerDTO;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
}

export function ContainerCard({
  container,
  onStart,
  onStop,
}: ContainerCardProps): React.JSX.Element {
  const shortId = container.id.substring(0, 8);
  const isRunning = container.status === 'running';

  return (
    <div
      className="flex items-center gap-3 rounded border border-base-300 bg-base-200 p-3"
      data-testid="container-card"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 shrink-0 rounded-full ${isRunning ? 'bg-success' : 'bg-error'}`}
            data-testid="status-indicator"
          />
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
          {isRunning && container.uptime && (
            <>
              <span>·</span>
              <span>Tempo ativo {container.uptime}</span>
            </>
          )}
          {!isRunning && <span>·</span>}
          {!isRunning && <span>Pronto para iniciar</span>}
        </div>
      </div>
      <button
        className={`shrink-0 rounded px-2.5 py-1 text-xs font-semibold cursor-pointer transition-colors ${
          isRunning
            ? 'bg-error text-white hover:bg-error/80'
            : 'border border-success text-success hover:bg-success/10'
        }`}
        onClick={() => (isRunning ? onStop(container.id) : onStart(container.id))}
        data-testid="action-button"
      >
        {isRunning ? 'Parar' : 'Iniciar'}
      </button>
    </div>
  );
}
