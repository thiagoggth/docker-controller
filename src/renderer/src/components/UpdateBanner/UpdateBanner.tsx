import { AppUpdateState } from '@core/shared/types/AppUpdateState';
import React from 'react';

interface UpdateBannerProps {
  updateState: AppUpdateState;
  requestInFlight: boolean;
  onDownload: () => void;
  onInstall: () => void;
}

function formatPercent(percent: number | null): string {
  if (percent == null) {
    return '0%';
  }

  return `${Math.round(percent)}%`;
}

export function UpdateBanner({
  updateState,
  requestInFlight,
  onDownload,
  onInstall,
}: UpdateBannerProps): React.JSX.Element | null {
  if (updateState.status === 'available') {
    return (
      <div className="alert alert-info shadow-sm">
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-info-content">
            Atualizacao {updateState.version ?? ''} disponivel
          </span>
          <p className="text-sm text-info-content/80">
            Uma nova versao do aplicativo foi encontrada e esta pronta para download.
          </p>
        </div>
        <button className="btn btn-sm btn-primary" onClick={onDownload} disabled={requestInFlight}>
          {requestInFlight ? 'Preparando...' : 'Baixar atualizacao'}
        </button>
      </div>
    );
  }

  if (updateState.status === 'downloading') {
    return (
      <div className="flex flex-col gap-3 rounded border border-info/20 bg-info/10 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-base-content">
              Baixando atualizacao {updateState.version ?? ''}
            </span>
            <p className="text-sm text-base-content/70">
              O download esta em andamento e o app vai pedir confirmacao antes de reiniciar.
            </p>
          </div>
          <span className="text-sm font-semibold text-base-content">
            {formatPercent(updateState.percent)}
          </span>
        </div>
        <progress
          className="progress progress-info w-full"
          value={updateState.percent ?? 0}
          max="100"
        />
      </div>
    );
  }

  if (updateState.status === 'downloaded') {
    return (
      <div className="alert alert-success shadow-sm">
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-success-content">
            Atualizacao {updateState.version ?? ''} pronta
          </span>
          <p className="text-sm text-success-content/80">
            O download foi concluido. Reinicie o aplicativo para instalar a nova versao.
          </p>
        </div>
        <button className="btn btn-sm btn-success" onClick={onInstall} disabled={requestInFlight}>
          {requestInFlight ? 'Reiniciando...' : 'Reiniciar e instalar'}
        </button>
      </div>
    );
  }

  if (updateState.status === 'error' && updateState.error) {
    return (
      <div className="alert alert-warning shadow-sm">
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-warning-content">Falha ao atualizar o aplicativo</span>
          <p className="text-sm text-warning-content/80">{updateState.error}</p>
        </div>
        {updateState.version && (
          <button
            className="btn btn-sm btn-warning"
            onClick={onDownload}
            disabled={requestInFlight}
          >
            {requestInFlight ? 'Tentando...' : 'Tentar novamente'}
          </button>
        )}
      </div>
    );
  }

  return null;
}
