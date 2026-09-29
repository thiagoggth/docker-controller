import { E_OnIPCChannels } from '@core/shared/enums/IPCChannels';
import {
  ContainerStreamDataDTO,
  ContainerStreamErrorDTO,
  ContainerTerminalExitDTO,
} from '@core/shared/types/ContainerStreamTypes';
import { resolveStartedSession } from '@gui/services/containerStreamLifecycle';
import { containerStreamService } from '@gui/services/containerStreamService';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import React, { useEffect, useRef, useState } from 'react';

interface ContainerTerminalPanelProps {
  containerId: string;
}

export function ContainerTerminalPanel({
  containerId,
}: ContainerTerminalPanelProps): React.JSX.Element {
  const elementRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [exitStatus, setExitStatus] = useState<number | null>(null);
  const [hasExited, setHasExited] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    let disposed = false;
    let sessionId: string | null = null;
    const pending: Array<
      | { type: 'data'; payload: ContainerStreamDataDTO }
      | { type: 'exit'; payload: ContainerTerminalExitDTO }
      | { type: 'error'; payload: ContainerStreamErrorDTO }
    > = [];
    const terminal = new Terminal({ cursorBlink: true, convertEol: true });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(element);
    fitAddon.fit();
    terminal.focus();

    const handle = (event: (typeof pending)[number]) => {
      if (!sessionId) {
        pending.push(event);
        return;
      }
      if (event.payload.sessionId !== sessionId) return;
      if (event.type === 'data') terminal.write(event.payload.data);
      else if (event.type === 'exit') {
        setExitStatus(event.payload.exitCode);
        setHasExited(true);
      } else setError(event.payload.message);
    };

    const removeData = window.api.on<ContainerStreamDataDTO>(
      E_OnIPCChannels.CONTAINERS_TERMINAL_DATA,
      (event) => handle({ type: 'data', payload: event }),
    );
    const removeExit = window.api.on<ContainerTerminalExitDTO>(
      E_OnIPCChannels.CONTAINERS_TERMINAL_EXIT,
      (event) => handle({ type: 'exit', payload: event }),
    );
    const removeError = window.api.on<ContainerStreamErrorDTO>(
      E_OnIPCChannels.CONTAINERS_TERMINAL_ERROR,
      (event) => handle({ type: 'error', payload: event }),
    );
    const inputSubscription = terminal.onData((data) => {
      if (sessionId) containerStreamService.sendTerminalInput({ sessionId, data });
    });
    const observer = new ResizeObserver(() => {
      fitAddon.fit();
      if (sessionId) {
        containerStreamService.resizeTerminal({
          sessionId,
          cols: terminal.cols,
          rows: terminal.rows,
        });
      }
    });
    observer.observe(element);

    void resolveStartedSession(
      containerStreamService.startTerminal({
        id: containerId,
        cols: terminal.cols,
        rows: terminal.rows,
      }),
      () => disposed,
      containerStreamService.stopTerminal,
    )
      .then((id) => {
        if (!id) return;
        sessionId = id;
        for (const event of pending.splice(0)) handle(event);
      })
      .catch((startError: unknown) => {
        if (!disposed)
          setError(startError instanceof Error ? startError.message : 'Falha ao iniciar terminal');
      });

    return () => {
      disposed = true;
      observer.disconnect();
      inputSubscription.dispose();
      removeData();
      removeExit();
      removeError();
      terminal.dispose();
      fitAddon.dispose();
      if (sessionId) void containerStreamService.stopTerminal(sessionId);
    };
  }, [containerId]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 p-4">
      {error && (
        <div role="alert" className="text-xs text-error">
          {error}
        </div>
      )}
      {hasExited && (
        <div className="text-xs text-base-content/70">
          Terminal encerrado (código {exitStatus ?? 'indisponível'})
        </div>
      )}
      <div
        ref={elementRef}
        aria-label="Terminal do contêiner"
        className="h-96 min-h-64 rounded bg-neutral p-2"
      />
    </div>
  );
}
