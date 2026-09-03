// FILE: client/src/components/shared/ErrorBanner.jsx
// SECURITY: Directive 6.4 (Persistence Error Handling)
// AGENT: Core Shared UI Component

import React from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';

export function ErrorBanner({
  message = "Unable to save to Firestore. Your input is preserved.",
  onRetry,
  onDismiss,
  retryLoading = false
}) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="bg-amber-50 border border-amber-300 rounded-xl p-4 my-3 text-amber-900 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold text-amber-950">Cloud Sync Alert</h4>
          <p className="text-xs text-amber-800 mt-0.5">{message}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 self-end sm:self-center">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={retryLoading}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${retryLoading ? 'animate-spin' : ''}`} />
            <span>{retryLoading ? 'Retrying...' : 'Retry Save'}</span>
          </button>
        )}
        {onDismiss && (
          <button type="button" onClick={onDismiss} className="p-1 text-amber-700 hover:text-amber-950">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default ErrorBanner;
