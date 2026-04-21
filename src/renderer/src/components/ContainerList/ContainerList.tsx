import { ContainerDTO } from '@core/shared/dtos/ContainerDTO';
import { ContainerCard } from '@gui/components/ContainerCard/ContainerCard';
import React from 'react';

interface ContainerListProps {
  containers: ContainerDTO[];
  onStart: (id: string) => void;
  onStop: (id: string) => void;
}

export function ContainerList({
  containers,
  onStart,
  onStop,
}: ContainerListProps): React.JSX.Element {
  const running = containers.filter((c) => c.status === 'running');
  const stopped = containers.filter((c) => c.status === 'stopped' || c.status === 'die');

  return (
    <div className="space-y-6">
      {running.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success" />
            Running ({running.length})
          </h2>
          <div className="space-y-3">
            {running.map((container) => (
              <ContainerCard
                key={container.id}
                container={container}
                onStart={onStart}
                onStop={onStop}
              />
            ))}
          </div>
        </section>
      )}

      {stopped.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-base-content/30" />
            Stopped ({stopped.length})
          </h2>
          <div className="space-y-3">
            {stopped.map((container) => (
              <ContainerCard
                key={container.id}
                container={container}
                onStart={onStart}
                onStop={onStop}
              />
            ))}
          </div>
        </section>
      )}

      {containers.length === 0 && (
        <div className="text-center py-8 opacity-60">
          <p>No containers found</p>
        </div>
      )}
    </div>
  );
}
