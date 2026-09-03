import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchGovernmentClients, GovernmentClient } from '../api/governmentClients';
import { fetchMyProfile } from '../api/profile';
import { decideConsent } from '../api/consent';
import { uploadDocument } from '../api/documents';
import { EDUCATION_CREDENTIAL_TYPE, findMissingFields, getPortalDisplay, resolveCanonicalValue } from '../config/portalDisplay';
import { CanonicalProfile } from '../types';
import { ApiError } from '../api/client';
import { LoadingBlock, ErrorBanner, InfoBanner } from '../components/Feedback';
import { DataCategoryTag } from '../components/StatusBadge';

export default function ConsentReviewPage() {
  const { portalId: clientId } = useParams<{ portalId: string }>();
  const navigate = useNavigate();

  const [client, setClient] = useState<GovernmentClient | null>(null);
  const [profile, setProfile] = useState<CanonicalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deciding, setDeciding] = useState<'grant' | 'deny' | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const display = clientId ? getPortalDisplay(clientId) : undefined;

  async function load() {
    try {
      const [clientsRes, profileRes] = await Promise.all([fetchGovernmentClients(), fetchMyProfile()]);
      const found = clientsRes.entries.find((c) => c.clientId === clientId);
      if (!found) {
        setError('Unknown or unregistered government portal.');
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
  }, [clientId]);

  if (loading) return <LoadingBlock label="Preparing consent request…" />;
  if (error) return <ErrorBanner message={error} />;
  if (!client || !profile) return null;

  const requestedFields = client.allowedScopes;
  const missingFields = findMissingFields(profile, requestedFields);

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
    if (!client) return;
    setDeciding(decision === 'GRANTED' ? 'grant' : 'deny');
    try {
      const result = await decideConsent({
        clientId: client.clientId,
        requestedFields,
        decision,
        purpose: `${client.name} application`,
      });

      if (decision === 'GRANTED' && result.accessToken) {
        // Hand the token to the "portal side" screen via navigation state —
        // this is the one moment the authorization crosses the boundary.
        // The portal screen never reads the citizen's profile directly; it
        // only ever has this token, matching the real SSC <-> OTR boundary.
        navigate(`/portals/${client.clientId}/apply`, {
          state: { accessTokenId: result.accessToken.id, token: result.accessToken.token },
        });
      } else {
        navigate('/portals');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not record your decision.');
    } finally {
      setDeciding(null);
    }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <h1>Consent request from {client.name}</h1>
      <p>
        {client.organisation} is asking for consent-based access to specific fields of your OTR profile. If you
        allow this, OTR issues {client.name} a scoped, revocable access token — it does not hand over your whole
        profile, and it does not let {client.name} edit anything in OTR.
      </p>

      <InfoBanner>
        Approving this request creates a real access token, enforced server-side to exactly the fields listed
        below — see <code>POST /api/consent/decisions</code>. Nothing is shared with {client.name} until you
        approve.
      </InfoBanner>

      {missingFields.length > 0 && (
        <div className="card" style={{ marginTop: '1rem', borderColor: 'var(--warn, #d8ab3d)' }}>
          <h2 style={{ marginTop: 0 }}>Complete your OTR profile first</h2>
          <p style={{ fontSize: '0.85rem' }}>
            {client.name} requires the following, which isn't in your OTR profile yet:
          </p>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {missingFields.map((path) => (
              <li
                key={path}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}
              >
                <span>⚠ {display?.fieldLabels[path] ?? path}</span>
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

      <div className="card" style={{ marginTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 style={{ margin: 0 }}>This portal is requesting:</h2>
          <DataCategoryTag kind="reusable" />
        </div>

        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {requestedFields.map((path) => (
            <li
              key={path}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.6rem 0',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <span>
                ✓ {display?.fieldLabels[path] ?? path}{' '}
                <span className="tag-source" style={{ marginLeft: '0.4rem' }}>
                  {path}
                </span>
              </span>
              <span style={{ color: 'var(--ink-soft)' }}>{resolveCanonicalValue(profile, path)}</span>
            </li>
          ))}
        </ul>

        <p style={{ fontSize: '0.82rem', marginTop: '0.9rem' }}>
          No other information from your OTR profile — other credentials, documents, or fields not listed above —
          will ever be accessible to {client.name} under this authorization.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button
            className="btn btn-primary"
            onClick={() => handleDecision('GRANTED')}
            disabled={deciding !== null || missingFields.length > 0}
          >
            {deciding === 'grant' ? 'Authorizing…' : 'Allow & Continue'}
          </button>
          <button className="btn btn-secondary" onClick={() => handleDecision('DENIED')} disabled={deciding !== null}>
            {deciding === 'deny' ? 'Cancelling…' : 'Cancel'}
          </button>
        </div>
        {missingFields.length > 0 && (
          <p style={{ fontSize: '0.78rem', color: 'var(--danger, #b91c1c)', marginTop: '0.5rem' }}>
            Upload the missing document(s) above before you can authorize this request.
          </p>
        )}
      </div>
    </div>
  );
}
