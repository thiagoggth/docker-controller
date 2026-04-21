import React from 'react';
import { ContainerDTO } from '@core/shared/dtos/ContainerDTO';

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
  const shortId = container.id.substring(0, 12);
  const isRunning = container.status === 'running';

  return (
    <div className={`card shadow-md ${isRunning ? 'bg-base-100' : 'bg-base-200'}`}>
      <div className="card-body p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${isRunning ? 'bg-success' : 'bg-base-content/30'}`}
              data-testid="status-indicator"
            />
            <h3 className="card-title text-lg">{container.name}</h3>
          </div>
          <button
            className={`btn btn-sm ${isRunning ? 'btn-error' : 'btn-success'}`}
            onClick={() => (isRunning ? onStop(container.id) : onStart(container.id))}
            data-testid="action-button"
          >
            {isRunning ? 'Stop' : 'Start'}
          </button>
        </div>

        <div className="text-sm opacity-70 mt-1">
          <span className="font-mono">{shortId}</span>
          <span className="mx-2">•</span>
          <span>{container.image}</span>
        </div>

        {container.ports.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {container.ports.map((port, index) => (
              <span key={index} className="badge badge-outline badge-sm">
                {port}
              </span>
            ))}
          </div>
        )}

        {isRunning && container.uptime && (
          <div className="text-xs opacity-60 mt-1">Uptime: {container.uptime}</div>
        )}
      </div>
    </div>
  );
}
