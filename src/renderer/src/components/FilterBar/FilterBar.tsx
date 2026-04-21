import { SearchBar } from '@gui/components/SearchBar/SearchBar';
import { StatusFilter } from '@gui/components/StatusFilter/StatusFilter';
import React from 'react';

export function FilterBar(): React.JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <SearchBar />
      <StatusFilter />
    </div>
  );
}
