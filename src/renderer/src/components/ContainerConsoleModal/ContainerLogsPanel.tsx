import { E_OnIPCChannels } from '@core/shared/enums/IPCChannels';
import { ContainerDTO } from '@core/shared/dtos/ContainerDTO';
import {
  ContainerStreamDataDTO,
  ContainerStreamErrorDTO,
  ContainerStreamSessionDTO,
} from '@core/shared/types/ContainerStreamTypes';
import { resolveStartedSession } from '@gui/services/containerStreamLifecycle';
import { containerStreamService } from '@gui/services/containerStreamService';
import React, { useEffect, useRef, useState } from 'react';
import { appendLogChunk } from './logBuffer';

interface ContainerLogsPanelProps {
  container: ContainerDTO;
}

type LogsStatus = 'loading' | 'streaming' | 'ended' | 'error';

export function ContainerLogsPanel({ container }: ContainerLogsPanelProps): React.JSX.Element {
  const [logs, setLogs] = useState('');
  const [status, setStatus] = useState<LogsStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const outputRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight });
  }, [logs]);

  useEffect(() => {
    let disposed = false;
    sessionIdRef.current = null;

    const removeDataListener = window.api.on<ContainerStreamDataDTO>(
      E_OnIPCChannels.CONTAINERS_LOGS_DATA,
      ({ sessionId, data }) => {
        if (sessionId !== sessionIdRef.current) {
          return;
        }

        setLogs((current) => appendLogChunk(current, data));
      },
    );
    const removeEndedListener = window.api.on<ContainerStreamSessionDTO>(
      E_OnIPCChannels.CONTAINERS_LOGS_ENDED,
      ({ sessionId }) => {
        if (sessionId === sessionIdRef.current) {
          setStatus('ended');
        }
      },
    );
    const removeErrorListener = window.api.on<ContainerStreamErrorDTO>(
      E_OnIPCChannels.CONTAINERS_LOGS_ERROR,
      ({ sessionId, message }) => {
        if (sessionId === sessionIdRef.current) {
          setError(message);
          setStatus('error');
        }
      },
    );

    void resolveStartedSession(
      containerStreamService.startLogs({ id: container.id }),
      () => disposed,
      containerStreamService.stopLogs,
    )
      .then((sessionId) => {
        if (!sessionId) {
          return;
        }

        sessionIdRef.current = sessionId;
        setStatus('streaming');
      })
      .catch((startError) => {
        if (!disposed) {
          setError(startError instanceof Error ? startError.message : 'Falha ao carregar logs');
          setStatus('error');
        }
      });

    return () => {
      disposed = true;
      removeDataListener();
      removeEndedListener();
      removeErrorListener();

      const sessionId = sessionIdRef.current;
      if (sessionId) {
        void containerStreamService.stopLogs(sessionId);
      }
    };
  }, [container.id]);

  const statusText = {
    loading: 'Carregando logs...',
    streaming: 'Transmitindo logs',
    ended: 'Fluxo de logs encerrado',
    error: 'Falha ao carregar logs',
  }[status];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 px-4 py-3">
      <div className="flex items-center justify-between text-xs text-base-content/70">
        <span>{statusText}</span>
        {status === 'streaming' && <span className="loading loading-dots loading-xs" />}
      </div>
      {error && (
        <div className="rounded border border-error/40 bg-error/10 px-3 py-2 text-xs text-error">
          {error}
        </div>
      )}
      <pre
        className="h-96 overflow-auto rounded border bg-neutral p-3 font-mono text-xs leading-5 text-neutral-content"
        ref={outputRef}
      >
        {logs}
      </pre>
    </div>
  );
}
