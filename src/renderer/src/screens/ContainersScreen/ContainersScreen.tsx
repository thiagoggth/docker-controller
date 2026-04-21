import { ContainerList } from '@gui/components/ContainerList/ContainerList';
import { ErrorBanner } from '@gui/components/ErrorBanner/ErrorBanner';
import { ThemeToggle } from '@gui/components/ThemeToggle/ThemeToggle';
import { useContainerStore } from '@gui/stores/containerStore';
import { useThemeStore } from '@gui/stores/themeStore';
import React, { useEffect } from 'react';

export function ContainersScreen(): React.JSX.Element {
  const containers = useContainerStore((state) => state.containers);
  const loading = useContainerStore((state) => state.loading);
  const error = useContainerStore((state) => state.error);
  const fetchContainers = useContainerStore((state) => state.fetchContainers);
  const startContainer = useContainerStore((state) => state.startContainer);
  const stopContainer = useContainerStore((state) => state.stopContainer);
  const subscribeToUpdates = useContainerStore((state) => state.subscribeToUpdates);

  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  useEffect(() => {
    fetchContainers();
  }, [fetchContainers]);

  useEffect(() => {
    return subscribeToUpdates();
  }, [subscribeToUpdates]);

  const handleDismissError = () => {
    useContainerStore.setState({ error: null });
  };

  return (
    <div className="min-h-screen bg-base-100">
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Docker Interface Controller</h1>
          <div className="flex items-center gap-4">
            <ThemeToggle theme={theme} onToggle={setTheme} />
          </div>
        </div>

        {error && (
          <div className="mb-4">
            <ErrorBanner message={error} onDismiss={handleDismissError} />
          </div>
        )}

        {loading && containers.length === 0 && (
          <div className="flex justify-center py-8">
            <span className="loading loading-spinner loading-lg" />
          </div>
        )}

        <ContainerList containers={containers} onStart={startContainer} onStop={stopContainer} />
      </div>
    </div>
  );
}
