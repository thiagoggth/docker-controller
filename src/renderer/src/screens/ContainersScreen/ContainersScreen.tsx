import { ContainerList } from '@gui/components/ContainerList/ContainerList';
import { ThemeToggle } from '@gui/components/ThemeToggle/ThemeToggle';
import { useContainerStore } from '@gui/stores/containerStore';
import { useThemeStore } from '@gui/stores/themeStore';
import React, { useEffect } from 'react';

export function ContainersScreen(): React.JSX.Element {
  const containers = useContainerStore((state) => state.containers);
  const loading = useContainerStore((state) => state.loading);
  const error = useContainerStore((state) => state.error);
  const dockerAvailable = useContainerStore((state) => state.dockerAvailable);
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

  const handleRefresh = () => {
    fetchContainers();
  };

  const runningCount = containers.filter((c) => c.status === 'running').length;
  const stoppedCount = containers.filter(
    (c) => c.status === 'stopped' || c.status === 'die',
  ).length;
  const totalCount = containers.length;

  return (
    <div className="flex min-h-screen flex-col gap-4 bg-base-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-base font-semibold text-base-content">Contêineres</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="flex items-center cursor-pointer gap-1.5 rounded bg-base-200 px-2.5 py-2 text-primary border border-base-300 transition-colors hover:bg-base-300"
            data-testid="refresh-button"
            title="Recarregar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-base-content"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              <polyline points="21 3 21 9 15 9" />
            </svg>
          </button>
          <ThemeToggle theme={theme} onToggle={setTheme} />
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5 rounded border border-base-300 bg-base-200 p-3.5">
          <span className="text-xs font-semibold text-base-content/60">Total</span>
          <span className="text-lg font-semibold text-base-content">{totalCount} contêineres</span>
        </div>
        <div className="flex flex-col gap-1.5 rounded border border-base-300 bg-base-200 p-3.5">
          <span className="text-xs font-semibold text-base-content/60">Rodando</span>
          <span className="text-lg font-semibold text-base-content">{runningCount}</span>
        </div>
        <div className="flex flex-col gap-1.5 rounded border border-base-300 bg-base-200 p-3.5">
          <span className="text-xs font-semibold text-base-content/60">Parados</span>
          <span className="text-lg font-semibold text-base-content">{stoppedCount}</span>
        </div>
      </div>

      {/* Content Row */}
      <div className="flex flex-col gap-3 lg:flex-row">
        {/* Main Content */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {loading && containers.length === 0 && (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-lg" />
            </div>
          )}

          {error && !dockerAvailable && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1.5 rounded border border-base-300 bg-base-200 p-3.5">
                <span className="text-sm font-semibold text-base-content">Docker indisponível</span>
                <p className="text-xs text-base-content/70">
                  Inicie o Docker antes de abrir a lista de contêineres.
                </p>
                <p className="text-xs text-error/80">Windows: abra o Docker Desktop.</p>
                <p className="text-xs text-error/80">Linux: sudo systemctl start docker</p>
              </div>
            </div>
          )}

          {error && dockerAvailable && (
            <div className="alert alert-error shadow-lg">
              <div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="stroke-current h-6 w-6 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p>{error}</p>
              </div>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => useContainerStore.setState({ error: null })}
              >
                ✕
              </button>
            </div>
          )}

          {!error && dockerAvailable && (
            <ContainerList
              containers={containers}
              onStart={startContainer}
              onStop={stopContainer}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="flex w-full flex-col gap-3 lg:w-1/3 lg:max-w-xs">
          {/* Connection Status Card */}
          <div
            className={`flex items-center gap-3 rounded border border-base-300 p-3 ${
              dockerAvailable ? 'bg-base-200' : 'bg-base-300/50'
            }`}
          >
            <div
              className={`h-2 w-2 shrink-0 rounded-full ${
                dockerAvailable ? 'bg-success' : 'bg-error'
              }`}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span
                className={`text-xs font-semibold ${
                  dockerAvailable ? 'text-success' : 'text-error'
                }`}
              >
                {dockerAvailable ? 'Disponível' : 'Indisponível'}
              </span>
              {!dockerAvailable && (
                <span className="text-xs text-base-content/60">Aguardando o daemon responder.</span>
              )}
            </div>
          </div>

          {/* Offline tip card */}
          {!dockerAvailable && (
            <div className="flex flex-col gap-1.5 rounded border border-base-300 bg-base-200 p-3">
              <span className="text-sm font-semibold text-base-content">Dica rápida</span>
              <p className="text-xs text-base-content/70">
                Depois de iniciar o Docker, clique em recarregar para atualizar a lista.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
