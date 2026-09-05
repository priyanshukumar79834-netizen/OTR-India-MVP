import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchGovernmentClients, GovernmentClient } from '../api/governmentClients';
import { fetchMyProfile } from '../api/profile';
import { decideConsent } from '../api/consent';
import { uploadDocument } from '../api/documents';
import {
  EDUCATION_CREDENTIAL_TYPE,
  findMissingFields,
  getPermissionCategoryLabel,
  getPortalDisplay,
} from '../config/portalDisplay';
import { CanonicalProfile } from '../types';
import { ApiError } from '../api/client';
import { LoadingBlock, ErrorBanner, InfoBanner } from '../components/Feedback';

/**
 * The real cross-site consent boundary (MASTER_SPECIFICATION.md §11, §21).
 *
 * A SEPARATE website (e.g. the standalone Mock SSC portal) sends the
 * citizen's browser here with a full page navigation —
 * `OTR_URL/authorize?client_id=SSC_EXAM_PORTAL&redirect_uri=<ssc-callback>`
 * — the same shape a real OAuth-style "Continue with OTR" button would
 * use. This is NOT an internal route the OTR frontend links to itself.
 *
 * On approval, OTR calls the existing POST /api/consent/decisions (same
 * server-side enforcement as before: a client can never be granted more
 * than its registered `allowedScopes`), then redirects the browser BACK
 * to the portal's own `redirect_uri` with the opaque access token in the
 * URL fragment (`#token=...`) rather than a query string — fragments are
 * never sent to the server on the follow-up request and don't appear in
 * Referer headers, which matters here because the fragment briefly
 * carries a bearer credential. The portal's own JS reads it client-side.
 *
 * OTR never calls into the portal's site, never fills in its form, and
 * never sees anything beyond "this client asked for these fields."
 *
 * Batch 2 design rule: this screen shows citizen-friendly PERMISSION
 * CATEGORIES ("Name access", "Date of birth access", ...), never the
 * actual field values. Anyone reviewing consent should be able to
 * understand what's being asked without the screen becoming a data dump
 * of their own information. The exact underlying fields are still
 * available in an optional, collapsed "technical details" disclosure for
 * anyone who wants that precision.
 */
export default function AuthorizePage() {
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const purpose = searchParams.get('purpose') ?? undefined;

  const [client, setClient] = useState<GovernmentClient | null>(null);
  const [profile, setProfile] = useState<CanonicalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deciding, setDeciding] = useState<'grant' | 'deny' | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const display = clientId ? getPortalDisplay(clientId) : undefined;

  async function load() {
    if (!clientId || !redirectUri) {
      setError('This request is missing required information (client_id / redirect_uri). Go back to the government portal and try again.');
      setLoading(false);
      return;
    }
    try {
      const [clientsRes, profileRes] = await Promise.all([fetchGovernmentClients(), fetchMyProfile()]);
      const found = clientsRes.entries.find((c) => c.clientId === clientId);
      if (!found) {
        setError('This is not a government service registered with OTR. Nothing has been shared.');
      } else {
        setClient(found);
      }
      setProfile(profileRes);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load this request.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, redirectUri]);

  if (loading) return <LoadingBlock label="Preparing consent request…" />;
  if (error) return <ErrorBanner message={error} />;
  if (!client || !profile || !redirectUri) return null;

  const requestedFields = client.allowedScopes;
  const missingFields = findMissingFields(profile, requestedFields);

  // De-duplicate into citizen-friendly categories — education.secondary
  // and education.seniorSecondary both surface as one "Education access"
  // row, since that's the level of detail a citizen needs to decide.
  const categories = Array.from(new Set(requestedFields.map(getPermissionCategoryLabel)));

  async function handleUploadMissing(path: string) {
    const level = path.split('.')[1];
    const documentType = EDUCATION_CREDENTIAL_TYPE[level] ?? level;
    setUploadingField(path);
    try {
      await uploadDocument({
        documentType,
        fileName: `${documentType.toLowerCase().replace(/\s+/g, '_')}.pdf`,
        saveToProfile: true,
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed.');
    } finally {
      setUploadingField(null);
    }
  }

  async function handleDecision(decision: 'GRANTED' | 'DENIED') {
    if (!client || !redirectUri) return;
    setDeciding(decision === 'GRANTED' ? 'grant' : 'deny');
    try {
      const result = await decideConsent({
        clientId: client.clientId,
        requestedFields,
        decision,
        purpose: purpose ?? `${client.name} application`,
      });

      if (decision === 'GRANTED' && result.accessToken) {
        // The ONE moment authorization crosses from OTR to the portal's
        // own site — a real cross-origin redirect, not an in-app
        // navigation. The token travels in the URL fragment so it's
        // never sent to any server as part of this navigation.
        const url = new URL(redirectUri);
        url.hash = new URLSearchParams({
          token: result.accessToken.token,
          clientId: client.clientId,
          expiresAt: result.accessToken.expiresAt,
        }).toString();
        window.location.href = url.toString();
      } else {
        const url = new URL(redirectUri);
        url.searchParams.set('denied', 'true');
        window.location.href = url.toString();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not record your decision.');
      setDeciding(null);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 560, paddingTop: '3rem', paddingBottom: '3rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'var(--brand)',
            color: '#fff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 750,
            fontSize: '0.85rem',
            marginBottom: '0.9rem',
          }}
        >
          OTR
        </div>
        <h1 style={{ fontSize: '1.4rem' }}>A government service wants to access your OTR profile</h1>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--neutral)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Requester
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{client.name}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>{client.organisation}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--neutral)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Purpose
            </div>
            <div style={{ fontSize: '0.9rem' }}>{purpose ?? `${client.name} application`}</div>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1.1rem 0' }} />

        <p style={{ fontSize: '0.85rem', marginTop: 0, marginBottom: '0.75rem' }}>
          If you allow this, {client.name} will be able to request the following categories of information from
          your OTR profile:
        </p>

        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {categories.map((label) => (
            <li
              key={label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.6rem 0',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <span>{label}</span>
              <span style={{ color: 'var(--reusable)', fontWeight: 700 }}>✓</span>
            </li>
          ))}
        </ul>

        <p style={{ fontSize: '0.8rem', marginTop: '0.9rem', marginBottom: 0 }}>
          No other information from your OTR profile — other credentials, documents, or fields not listed above —
          will ever be accessible to {client.name} under this authorization. The actual values are never shown on
          this screen; only {client.name} sees them, and only after you approve.
        </p>

        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          className="btn btn-secondary"
          style={{ marginTop: '0.9rem', padding: '0.35em 0.85em', fontSize: '0.78rem' }}
        >
          {showDetails ? 'Hide technical details' : 'Show technical details'}
        </button>

        {showDetails && (
          <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--neutral)' }}>
            <p style={{ marginBottom: '0.4rem' }}>Exact profile fields covered by this request:</p>
            <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
              {requestedFields.map((path) => (
                <li key={path}>{display?.fieldLabels[path] ?? path}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {missingFields.length > 0 && (
        <div className="card" style={{ marginTop: '1rem', borderColor: 'var(--pending)' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>Complete your OTR profile first</h2>
          <p style={{ fontSize: '0.85rem' }}>
            {client.name} requires the following, which isn't in your OTR profile yet:
          </p>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {missingFields.map((path) => (
              <li
                key={path}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}
              >
                <span>⚠ {getPermissionCategoryLabel(path)}</span>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleUploadMissing(path)}
                  disabled={uploadingField !== null}
                >
                  {uploadingField === path ? 'Uploading…' : 'Upload document'}
                </button>
              </li>
            ))}
          </ul>
          <p style={{ fontSize: '0.78rem', color: 'var(--neutral)' }}>
            Uploaded documents are saved to your OTR profile as <em>User Provided</em> — not automatically marked
            Verified — and become available for this and future applications.
          </p>
        </div>
      )}

      <InfoBanner>
        Approving creates a real, scoped access token, enforced on OTR's servers. You'll be sent back to{' '}
        {client.name} immediately after your decision.
      </InfoBanner>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          className="btn btn-primary btn-block"
          onClick={() => handleDecision('GRANTED')}
          disabled={deciding !== null || missingFields.length > 0}
        >
          {deciding === 'grant' ? 'Authorizing…' : 'Allow Access'}
        </button>
        <button className="btn btn-secondary btn-block" onClick={() => handleDecision('DENIED')} disabled={deciding !== null}>
          {deciding === 'deny' ? 'Cancelling…' : 'Decline'}
        </button>
      </div>
      {missingFields.length > 0 && (
        <p style={{ fontSize: '0.78rem', color: 'var(--danger)', marginTop: '0.5rem', textAlign: 'center' }}>
          Upload the missing document(s) above before you can authorize this request.
        </p>
      )}
    </div>
  );
}
