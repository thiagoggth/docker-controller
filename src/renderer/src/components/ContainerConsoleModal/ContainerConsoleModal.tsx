import { ContainerDTO } from '@core/shared/dtos/ContainerDTO';
import React from 'react';
import { FiX } from 'react-icons/fi';
import { ContainerLogsPanel } from './ContainerLogsPanel';

interface ContainerConsoleModalProps {
  container: ContainerDTO;
  mode: 'logs' | 'terminal';
  onClose: () => void;
}

export function ContainerConsoleModal({
  container,
  mode,
  onClose,
}: ContainerConsoleModalProps): React.JSX.Element {
  const title = `${mode === 'logs' ? 'Logs' : 'Terminal'} - ${container.name}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[86vh] w-full max-w-4xl flex-col overflow-hidden rounded border bg-base-100 shadow-xl"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <h2 className="truncate text-sm font-semibold text-base-content">{title}</h2>
          <button
            aria-label="Fechar console"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded text-base-content/70 transition-colors hover:bg-base-200 hover:text-base-content"
            onClick={onClose}
            type="button"
          >
            <FiX aria-hidden="true" className="h-4 w-4" />
          </button>
        </header>
        {mode === 'logs' ? <ContainerLogsPanel container={container} key={container.id} /> : null}
      </section>
    </div>
  );
}
