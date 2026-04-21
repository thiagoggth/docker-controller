import React from 'react';
import { useContainerStore } from '@gui/stores/containerStore';

export function SearchBar(): React.JSX.Element {
  const searchQuery = useContainerStore((state) => state.searchQuery);
  const setSearchQuery = useContainerStore((state) => state.setSearchQuery);

  return (
    <div className="flex flex-1 items-center gap-2 rounded border border-base-300 bg-base-200 px-3 py-2">
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
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="text"
        placeholder="Pesquisar por nome, imagem ou ID..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full bg-transparent text-sm text-base-content placeholder:text-base-content/50 outline-none"
      />
    </div>
  );
}
