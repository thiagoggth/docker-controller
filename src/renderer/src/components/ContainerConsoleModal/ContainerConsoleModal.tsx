import { ContainerDTO } from '@core/shared/dtos/ContainerDTO';
import React, { useEffect, useRef } from 'react';
import { FiX } from 'react-icons/fi';
import { ContainerLogsPanel } from './ContainerLogsPanel';
import { ContainerTerminalPanel } from './ContainerTerminalPanel';

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
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) {
        return;
      }

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = focusableElements[0];
      const last = focusableElements.at(-1);

      if (!first || !last) {
        event.preventDefault();
      } else if (!dialogRef.current.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, []);

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
        ref={dialogRef}
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <h2 className="truncate text-sm font-semibold text-base-content">{title}</h2>
          <button
            aria-label="Fechar console"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded text-base-content/70 transition-colors hover:bg-base-200 hover:text-base-content"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <FiX aria-hidden="true" className="h-4 w-4" />
          </button>
        </header>
        {mode === 'logs' ? (
          <ContainerLogsPanel container={container} key={`logs-${container.id}`} />
        ) : (
          <ContainerTerminalPanel containerId={container.id} key={`terminal-${container.id}`} />
        )}
      </section>
    </div>
  );
}
