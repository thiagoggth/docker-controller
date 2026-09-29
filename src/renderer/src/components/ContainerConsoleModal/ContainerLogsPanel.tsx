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
import { ContainerLogsEvent, createContainerLogsEventGate } from './containerLogsEventGate';
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
    const eventGate = createContainerLogsEventGate((event: ContainerLogsEvent) => {
      if (event.type === 'data') {
        setLogs((current) => appendLogChunk(current, event.payload.data));
      } else if (event.type === 'ended') {
        setStatus('ended');
      } else {
        setError(event.payload.message);
        setStatus('error');
      }
    });

    const removeDataListener = window.api.on<ContainerStreamDataDTO>(
      E_OnIPCChannels.CONTAINERS_LOGS_DATA,
      (event) => eventGate.receive({ type: 'data', payload: event }),
    );
    const removeEndedListener = window.api.on<ContainerStreamSessionDTO>(
      E_OnIPCChannels.CONTAINERS_LOGS_ENDED,
      (event) => eventGate.receive({ type: 'ended', payload: event }),
    );
    const removeErrorListener = window.api.on<ContainerStreamErrorDTO>(
      E_OnIPCChannels.CONTAINERS_LOGS_ERROR,
      (event) => eventGate.receive({ type: 'error', payload: event }),
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
        eventGate.setSessionId(sessionId);
      })
      .catch((startError) => {
        if (!disposed) {
          setError(startError instanceof Error ? startError.message : 'Falha ao carregar logs');
          setStatus('error');
        }
      });

    return () => {
      disposed = true;
      eventGate.dispose();
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
