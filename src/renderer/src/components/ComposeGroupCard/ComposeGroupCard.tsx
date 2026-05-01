import { ContainerDTO } from '@core/shared/dtos/ContainerDTO';
import { ComposeGroupIcon } from '@gui/components/ContainerIcons/ContainerIcons';
import { ContainerTreeItem } from '@gui/components/ContainerTreeItem/ContainerTreeItem';
import React from 'react';

interface ComposeGroupCardProps {
  project: string;
  configPath: string;
  containers: ContainerDTO[];
  expanded: boolean;
  onToggleExpanded: () => void;
  onOpenFolder: (path: string) => Promise<void> | void;
  onStart: (id: string) => Promise<void> | void;
  onStop: (id: string) => Promise<void> | void;
  onStartAll: (containers: ContainerDTO[]) => Promise<void> | void;
  onStopAll: (containers: ContainerDTO[]) => Promise<void> | void;
}

function collectSummaryPorts(containers: ContainerDTO[]): string {
  const uniquePorts = new Set<string>();

  for (const container of containers) {
    for (const port of container.ports) {
      uniquePorts.add(port);
    }
  }

  return Array.from(uniquePorts).join(', ');
}

export function ComposeGroupCard({
  project,
  configPath,
  containers,
  expanded,
  onToggleExpanded,
  onOpenFolder,
  onStart,
  onStop,
  onStartAll,
  onStopAll,
}: ComposeGroupCardProps): React.JSX.Element {
  const namesSummary = containers.map((container) => container.name).join(', ');
  const portsSummary = collectSummaryPorts(containers);
  const hasStoppedContainers = containers.some((container) => container.status !== 'running');
  const areAllRunning = containers.length > 0 && containers.every((container) => container.status === 'running');

  const handleOpenFolder = async () => {
    await onOpenFolder(configPath);
  };

  const handleHeaderKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target instanceof HTMLElement && event.target.closest('button')) {
      return;
    }
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onToggleExpanded();
  };

  const handleLinkKeyDown = async (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    await handleOpenFolder();
  };

  const handleStartAll = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    await onStartAll(containers);
  };

  const handleStopAll = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    await onStopAll(containers);
  };

  const handleToggleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onToggleExpanded();
  };

  const handleHeaderClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target instanceof HTMLElement && event.target.closest('button')) {
      return;
    }

    onToggleExpanded();
  };

  return (
    <div className="rounded-lg border bg-base-200 p-3">
      <div
        className="flex cursor-pointer items-start gap-3 rounded-md"
        onClick={handleHeaderClick}
        onKeyDown={handleHeaderKeyDown}
        role="button"
        tabIndex={0}
      >
        <div
          className="min-w-0 flex flex-1 items-start gap-3 rounded-md text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          onKeyDown={handleHeaderKeyDown}
        >
          <div className="app-icon-badge flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
            <ComposeGroupIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-base-content">{project}</div>
            <div className="truncate text-xs text-base-content/60">{namesSummary}</div>

            {portsSummary && (
              <div className="mt-2 text-xs text-base-content/70">Portas {portsSummary}</div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            className={`cursor-pointer rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
              areAllRunning
                ? 'app-button-outline-error'
                : hasStoppedContainers
                ? 'app-button-outline-success'
                : 'app-button-outline-disabled cursor-default'
            }`}
            disabled={!areAllRunning && !hasStoppedContainers}
            onClick={areAllRunning ? handleStopAll : handleStartAll}
            type="button"
          >
            {areAllRunning ? 'Parar todos' : 'Iniciar todos'}
          </button>
          <button
            aria-label={expanded ? 'Retrair grupo' : 'Expandir grupo'}
            className="cursor-pointer rounded p-1 text-base-content/70 transition-colors hover:text-base-content"
            onClick={handleToggleClick}
            type="button"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pointer-events-none h-4 w-4"
              aria-hidden="true"
            >
              {expanded ? <path d="m18 15-6-6-6 6" /> : <path d="m6 9 6 6 6-6" />}
            </svg>
          </button>
        </div>
      </div>

      <button
        className="app-compose-link mt-2 flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        onClick={handleOpenFolder}
        onKeyDown={handleLinkKeyDown}
        type="button"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 shrink-0"
          aria-hidden="true"
        >
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        <span className="truncate">{configPath}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 shrink-0"
          aria-hidden="true"
        >
          <path d="M3 7h5l2 2h11v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-3 ml-4 border-l pl-4">
          <div className="flex flex-col gap-2">
            {containers.map((container) => (
              <ContainerTreeItem
                key={container.id}
                container={container}
                onStart={onStart}
                onStop={onStop}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
