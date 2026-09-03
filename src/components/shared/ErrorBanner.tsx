// FILE: src/components/shared/ErrorBanner.tsx
// SECURITY: Directive 6.4 (Persistence Failure Handling & Non-destructive Retries)
// AGENT: Core Shared UI Component

import React from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';

interface ErrorBannerProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  retryLoading?: boolean;
}

export function ErrorBanner({
  title,
  message = "Unable to process request. Your current input has been safely preserved.",
  onRetry,
  onDismiss,
  retryLoading = false
}: ErrorBannerProps) {
  // Determine contextual title if not explicitly passed
  let resolvedTitle = title;
  if (!resolvedTitle) {
    const msgLower = (message || '').toLowerCase();
    if (msgLower.includes('firestore') || msgLower.includes('sync') || msgLower.includes('persistence')) {
      resolvedTitle = 'Persistence Notice (Data Preserved)';
    } else if (msgLower.includes('auth') || msgLower.includes('token') || msgLower.includes('unauthorized')) {
      resolvedTitle = 'Authentication Notice';
    } else if (msgLower.includes('api key') || msgLower.includes('gemini')) {
      resolvedTitle = 'AI Service Notice (Input Preserved)';
    } else {
      resolvedTitle = 'Action Notice (Input Preserved)';
    }
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="bg-amber-50 border-2 border-slate-900 rounded-2xl p-4 my-3 text-amber-950 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-200 border-2 border-slate-900 rounded-xl text-amber-950 flex-shrink-0 mt-0.5 sm:mt-0 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
          <AlertTriangle className="w-5 h-5" aria-hidden="true" />
        </div>
        <div>
          <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">{resolvedTitle}</h4>
          <p className="text-xs text-slate-700 mt-0.5 leading-relaxed font-medium">{message}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={retryLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all uppercase tracking-wider"
            aria-label="Retry saving changes to Firestore"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${retryLoading ? 'animate-spin' : ''}`} />
            <span>{retryLoading ? 'Retrying...' : 'Retry Save'}</span>
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="p-1.5 text-slate-600 hover:text-slate-950 rounded-lg transition-colors border border-transparent hover:border-slate-300"
            aria-label="Dismiss error notification"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default ErrorBanner;
