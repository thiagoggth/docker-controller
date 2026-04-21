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
    <div className="flex flex-col gap-2">
      {running.map((container) => (
        <ContainerCard key={container.id} container={container} onStart={onStart} onStop={onStop} />
      ))}
      {stopped.map((container) => (
        <ContainerCard key={container.id} container={container} onStart={onStart} onStop={onStop} />
      ))}
      {containers.length === 0 && (
        <div className="rounded border border-base-300 bg-base-200 p-6 text-center">
          <p className="text-sm text-base-content/60">Nenhum contêiner encontrado</p>
        </div>
      )}
    </div>
  );
}
