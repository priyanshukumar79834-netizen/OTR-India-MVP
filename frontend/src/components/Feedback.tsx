import { ReactNode } from 'react';

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '2rem 0', color: 'var(--ink-soft)' }}>
      <span className="spinner" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="banner banner-error" role="alert">
      {message}
      {onRetry && (
        <button
          className="btn btn-secondary"
          style={{ marginLeft: '0.9rem', padding: '0.3em 0.8em' }}
          onClick={onRetry}
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function MockBanner({ children }: { children: ReactNode }) {
  return (
    <div className="banner banner-mock">
      <strong>Prototype note:</strong> {children}
    </div>
  );
}

/**
 * For real, live architecture explanations (e.g. "this call goes through
 * the token, not your session") — distinct from MockBanner, which is
 * reserved for things that are genuinely still simulated/placeholder.
 * Using the wrong one here would misrepresent what's actually implemented.
 */
export function InfoBanner({ children }: { children: ReactNode }) {
  return <div className="banner banner-info">{children}</div>;
}
