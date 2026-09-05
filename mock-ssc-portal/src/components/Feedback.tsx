import { ReactNode } from 'react';

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="redirect-screen">
      <span className="spinner" aria-hidden />
      <span style={{ color: 'var(--ink-soft)' }}>{label}</span>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="banner banner-error" role="alert">
      {message}
    </div>
  );
}

export function InfoBanner({ children }: { children: ReactNode }) {
  return <div className="banner banner-info">{children}</div>;
}

export function NoticeBanner({ children }: { children: ReactNode }) {
  return <div className="banner banner-notice">{children}</div>;
}
