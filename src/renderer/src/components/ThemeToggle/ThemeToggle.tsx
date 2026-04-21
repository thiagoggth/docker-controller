import React from 'react';

interface ThemeToggleProps {
  theme: 'light' | 'dark';
  onToggle: (theme: 'light' | 'dark') => void;
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps): React.JSX.Element {
  const isDark = theme === 'dark';

  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <span className="text-sm">Light</span>
      <input
        type="checkbox"
        className="toggle toggle-primary"
        checked={isDark}
        onChange={() => onToggle(isDark ? 'light' : 'dark')}
        data-testid="theme-toggle"
      />
      <span className="text-sm">Dark</span>
    </label>
  );
}
