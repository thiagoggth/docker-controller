import React from 'react';

interface ThemeToggleProps {
  theme: 'light' | 'dark';
  onToggle: (theme: 'light' | 'dark') => void;
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps): React.JSX.Element {
  const isDark = theme === 'dark';

  return (
    <div className="flex items-center gap-2 rounded-md border border-base-300 bg-base-200 px-2.5 py-1.5">
      <span className="text-xs font-semibold text-base-content">Modo escuro</span>
      <label className="relative inline-flex cursor-pointer items-center">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={isDark}
          onChange={() => onToggle(isDark ? 'light' : 'dark')}
          data-testid="theme-toggle"
        />
        <div className="peer h-5 w-9 rounded-full border border-base-300 bg-base-100 transition-colors peer-checked:bg-primary/20 peer-checked:border-primary" />
        <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-base-content/40 transition-transform peer-checked:translate-x-4 peer-checked:bg-primary" />
      </label>
    </div>
  );
}
