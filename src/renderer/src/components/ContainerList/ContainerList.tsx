import { ContainerDTO } from '@core/shared/dtos/ContainerDTO';
import { ComposeGroupCard } from '@gui/components/ComposeGroupCard/ComposeGroupCard';
import { ContainerTreeItem } from '@gui/components/ContainerTreeItem/ContainerTreeItem';
import React, { useEffect, useState } from 'react';

interface ComposeGroup {
  key: string;
  project: string;
  configPath: string;
  containers: ContainerDTO[];
}

function sortContainers(containers: ContainerDTO[]): ContainerDTO[] {
  const running = containers.filter((container) => container.status === 'running');
  const stopped = containers.filter(
    (container) => container.status === 'stopped' || container.status === 'die',
  );

  return [...running, ...stopped];
}

function buildContainerSections(containers: ContainerDTO[]): {
  groups: ComposeGroup[];
  standalone: ContainerDTO[];
} {
  const groupsMap = new Map<string, ComposeGroup>();
  const standalone: ContainerDTO[] = [];

  for (const container of containers) {
    if (!container.composeProject || !container.composeConfigPath) {
      standalone.push(container);
      continue;
    }

    const key = `${container.composeProject}::${container.composeConfigPath}`;
    const group = groupsMap.get(key);

    if (group) {
      group.containers.push(container);
      continue;
    }

    groupsMap.set(key, {
      key,
      project: container.composeProject,
      configPath: container.composeConfigPath,
      containers: [container],
    });
  }

  const groups = Array.from(groupsMap.values()).map((group) => ({
    ...group,
    containers: sortContainers(group.containers),
  }));

  return {
    groups,
    standalone: sortContainers(standalone),
  };
}

interface ContainerListProps {
  containers: ContainerDTO[];
  onStart: (id: string) => Promise<void> | void;
  onStop: (id: string) => Promise<void> | void;
  onOpenComposeFolder: (path: string) => Promise<void> | void;
}

export function ContainerList({
  containers,
  onStart,
  onStop,
  onOpenComposeFolder,
}: ContainerListProps): React.JSX.Element {
  const { groups, standalone } = buildContainerSections(containers);
  const groupKeySignature = groups.map((group) => group.key).join('|');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (groups.length === 0) {
      return;
    }

    setExpandedGroups((current) => {
      let changed = false;
      const next: Record<string, boolean> = {};

      for (const group of groups) {
        if (current[group.key] !== undefined) {
          next[group.key] = current[group.key];
          continue;
        }

        next[group.key] = false;
        changed = true;
      }

      if (!changed && Object.keys(current).length === groups.length) {
        return current;
      }

      return next;
    });
  }, [groupKeySignature]);

  const toggleGroupExpanded = (key: string) => {
    setExpandedGroups((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const handleStartAll = async (groupContainers: ContainerDTO[]) => {
    for (const container of groupContainers) {
      if (container.status === 'running') {
        continue;
      }

      try {
        await onStart(container.id);
      } catch {
        break;
      }
    }
  };

  const handleStopAll = async (groupContainers: ContainerDTO[]) => {
    for (const container of groupContainers) {
      if (container.status !== 'running') {
        continue;
      }

      try {
        await onStop(container.id);
      } catch {
        break;
      }
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {groups.map((group) => (
        <ComposeGroupCard
          key={group.key}
          project={group.project}
          configPath={group.configPath}
          containers={group.containers}
          expanded={!!expandedGroups[group.key]}
          onToggleExpanded={() => toggleGroupExpanded(group.key)}
          onOpenFolder={onOpenComposeFolder}
          onStart={onStart}
          onStop={onStop}
          onStartAll={handleStartAll}
          onStopAll={handleStopAll}
        />
      ))}

      {standalone.length > 0 && (
        <>
          {standalone.map((container) => (
            <ContainerTreeItem
              key={container.id}
              container={container}
              onStart={onStart}
              onStop={onStop}
            />
          ))}
        </>
      )}

      {containers.length === 0 && (
        <div className="rounded border bg-base-200 p-6 text-center">
          <p className="text-sm text-base-content/60">Nenhum contêiner encontrado</p>
        </div>
      )}
    </div>
  );
}
