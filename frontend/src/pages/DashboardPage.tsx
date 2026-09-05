import { ReactNode, useEffect, useState } from 'react';
import { fetchMyApplications, ApplicationEntry } from '../api/applications';
import { fetchConsentHistory, ConsentEntry } from '../api/consent';
import { fetchMyAuditLog, AuditLogEntry } from '../api/audit';
import { fetchMyAccessTokens, revokeAccessToken, AccessTokenSummary } from '../api/access';
import { getPortalDisplay } from '../config/portalDisplay';
import { ApiError } from '../api/client';
import { LoadingBlock, ErrorBanner } from '../components/Feedback';
import { ApplicationStatusBadge, ConsentStatusBadge } from '../components/StatusBadge';

const SSC_PORTAL_URL = import.meta.env.VITE_SSC_PORTAL_URL ?? 'http://localhost:5174';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function DashboardPage() {
  const [applications, setApplications] = useState<ApplicationEntry[] | null>(null);
  const [consents, setConsents] = useState<ConsentEntry[]>([]);
  const [audit, setAudit] = useState<AuditLogEntry[]>([]);
  const [tokens, setTokens] = useState<AccessTokenSummary[]>([]);
  const [tab, setTab] = useState<'applications' | 'consent' | 'access' | 'tokens'>('applications');
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  async function load() {
    try {
      const [a, c, h, t] = await Promise.all([
        fetchMyApplications(),
        fetchConsentHistory(),
        fetchMyAuditLog(),
        fetchMyAccessTokens(),
      ]);
      setApplications(a.entries);
      setConsents(c.entries);
      setAudit(h.entries);
      setTokens(t.entries);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your dashboard.');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRevoke(tokenId: string) {
    setRevokingId(tokenId);
    try {
      await revokeAccessToken(tokenId);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not revoke this token.');
    } finally {
      setRevokingId(null);
    }
  }

  if (error) return <ErrorBanner message={error} />;
  if (!applications) return <LoadingBlock label="Loading your dashboard…" />;

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Track every application you've submitted, every consent decision, and every time your data was accessed.</p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {(['applications', 'consent', 'access', 'tokens'] as const).map((t) => (
          <button key={t} className={t === tab ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setTab(t)}>
            {t === 'applications'
              ? 'Applications'
              : t === 'consent'
                ? 'Consent History'
                : t === 'access'
                  ? 'Audit Trail'
                  : 'Access Tokens'}
          </button>
        ))}
      </div>

      {tab === 'applications' && (
        <section className="card">
          {applications.length === 0 ? (
            <EmptyState
              text="No applications yet."
              action={
                <a href={SSC_PORTAL_URL} target="_blank" rel="noreferrer" className="btn btn-primary">
                  Open the Mock SSC portal
                </a>
              }
            />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', fontSize: '0.78rem', color: 'var(--neutral)' }}>
                  <th style={{ paddingBottom: '0.5rem' }}>Portal</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Application ID</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((a) => (
                  <tr key={a.applicationRefId} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.6rem 0' }}>{a.portalName}</td>
                    <td>{formatDate(a.submittedAt)}</td>
                    <td><ApplicationStatusBadge status={a.status} /></td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{a.applicationRefId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {tab === 'consent' && (
        <section className="card">
          {consents.length === 0 ? (
            <EmptyState text="No consent decisions yet." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {consents.map((c) => {
                const display = c.clientId ? getPortalDisplay(c.clientId) : undefined;
                return (
                  <div key={c.consentReference} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>{c.requestingApp}</strong>
                      <ConsentStatusBadge decision={c.decision} />
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--neutral)' }}>
                      {formatDate(c.decidedAt)} · Ref: {c.consentReference}
                    </div>
                    <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                      Fields requested: {c.requestedFields.map((f) => display?.fieldLabels[f] ?? f).join(', ')}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {tab === 'access' && (
        <section className="card">
          {audit.length === 0 ? (
            <EmptyState text="No audit history yet." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {audit.map((e) => (
                <div key={e.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.6rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ fontWeight: 600 }}>{e.event.replace(/_/g, ' ')}</span>
                    <span style={{ color: 'var(--neutral)' }}>{formatDate(e.createdAt)}</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--ink-soft)' }}>
                    {e.requestingSystem ?? 'OTR'} — {e.result}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'tokens' && (
        <section className="card">
          {tokens.length === 0 ? (
            <EmptyState text="No access tokens issued yet." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {tokens.map((t) => {
                const display = getPortalDisplay(t.clientId);
                return (
                  <div key={t.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>{t.clientId}</strong>
                      <span
                        className={`badge ${t.status === 'ACTIVE' ? 'badge-ok' : t.status === 'REVOKED' ? 'badge-danger' : 'badge-neutral'}`}
                      >
                        {t.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--neutral)' }}>
                      Expires {formatDate(t.expiresAt)} · Purpose: {t.purpose}
                    </div>
                    <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                      Scopes: {t.scopes.map((s) => display?.fieldLabels[s] ?? s).join(', ')}
                    </div>
                    {t.status === 'ACTIVE' && !t.linkedApplicationRefId && (
                      <button
                        className="btn btn-secondary"
                        style={{ marginTop: '0.5rem', padding: '0.3em 0.8em', fontSize: '0.82rem' }}
                        onClick={() => handleRevoke(t.id)}
                        disabled={revokingId === t.id}
                      >
                        {revokingId === t.id ? 'Revoking…' : 'Revoke access'}
                      </button>
                    )}
                    {t.status === 'ACTIVE' && t.linkedApplicationRefId && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--neutral)', marginTop: '0.5rem' }}>
                        In use by submitted application <span style={{ fontFamily: 'var(--font-mono)' }}>{t.linkedApplicationRefId}</span> —
                        can't be revoked from here.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function EmptyState({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--neutral)' }}>
      <p>{text}</p>
      {action}
    </div>
  );
}
