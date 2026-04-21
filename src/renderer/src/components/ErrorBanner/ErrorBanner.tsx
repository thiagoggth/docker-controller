import React from 'react';
import { Report } from '@core/shared/types/ApiTypes';

interface ErrorBannerProps {
  message: string;
  reports?: Report[];
  onDismiss: () => void;
}

export function ErrorBanner({ message, reports, onDismiss }: ErrorBannerProps): React.JSX.Element {
  return (
    <div className="alert alert-error shadow-lg" role="alert" data-testid="error-banner">
      <div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="stroke-current flex-shrink-0 h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <p data-testid="error-message">{message}</p>
          {reports && reports.length > 0 && (
            <ul className="mt-1 text-sm" data-testid="error-reports">
              {reports.map((report, index) => (
                <li key={index}>{report.message}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <button className="btn btn-sm btn-ghost" onClick={onDismiss} data-testid="dismiss-button">
        ✕
      </button>
    </div>
  );
}
