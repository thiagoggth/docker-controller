import { ContainerDtoStatus } from '@core/shared/dtos/ContainerDTO';
import { useContainerStore } from '@gui/stores/containerStore';
import React, { useEffect, useRef, useState } from 'react';

const STATUS_OPTIONS: { label: string; value: ContainerDtoStatus }[] = [
  { label: 'Rodando', value: 'running' },
  { label: 'Parados', value: 'stopped' },
];

export function StatusFilter(): React.JSX.Element {
  const statusFilter = useContainerStore((state) => state.statusFilter);
  const setStatusFilter = useContainerStore((state) => state.setStatusFilter);
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentLabel = STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (value: ContainerDtoStatus) => {
    setStatusFilter(value);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setStatusFilter(null);
  };

  const toggleDropdown = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <div ref={ref} className="relative">
      <div
        onClick={toggleDropdown}
        className="flex w-44 cursor-pointer select-none items-center justify-between gap-2 rounded border bg-base-200 px-3 py-2 text-sm text-base-content"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {!statusFilter && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 shrink-0 text-base-content/50"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
          )}
          <span
            className={`truncate ${!statusFilter ? 'text-base-content/50' : 'text-base-content'}`}
          >
            {currentLabel || 'Selecione um status'}
          </span>
        </div>
        {statusFilter ? (
          <button
            onClick={handleClear}
            className="shrink-0 cursor-pointer text-base-content/50 hover:text-base-content transition-colors"
            title="Limpar filtro"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-error"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 shrink-0 text-base-content/50 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        )}
      </div>
      {isOpen && (
        <ul className="absolute right-0 top-full z-50 mt-1 w-full menu rounded-box border bg-base-100 p-2 shadow">
          {STATUS_OPTIONS.map((option) => (
            <li key={option.value}>
              <a
                onClick={() => handleSelect(option.value)}
                className={statusFilter === option.value ? 'bg-base-200' : ''}
              >
                {option.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
