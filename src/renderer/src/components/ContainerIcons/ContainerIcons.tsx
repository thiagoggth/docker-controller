import React from 'react';

interface IconProps {
  className?: string;
}

export function ComposeGroupIcon({ className = 'h-4 w-4' }: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="6" cy="12" r="2.5" fill="currentColor" />
      <circle cx="18" cy="7" r="2.5" fill="currentColor" />
      <circle cx="18" cy="17" r="2.5" fill="currentColor" />
      <path
        d="M8.5 11L15.5 8.2M8.5 13L15.5 15.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DockerContainerIcon({ className = 'h-4 w-4' }: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="4" y="7" width="4" height="4" rx="0.8" fill="currentColor" />
      <rect x="9" y="7" width="4" height="4" rx="0.8" fill="currentColor" />
      <rect x="14" y="7" width="4" height="4" rx="0.8" fill="currentColor" />
      <rect x="9" y="2" width="4" height="4" rx="0.8" fill="currentColor" />
      <path
        d="M3 13.5H21C20.3 17.8 16.6 21 12 21C7.4 21 3.7 17.8 3 13.5Z"
        fill="currentColor"
      />
      <path d="M21 13.5C22 13.5 22.5 12.6 22.5 11.7" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
