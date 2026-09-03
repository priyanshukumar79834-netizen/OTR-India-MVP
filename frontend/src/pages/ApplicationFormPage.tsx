import { FormEvent, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { fetchGovernmentClients, GovernmentClient } from '../api/governmentClients';
import { retrieveDataWithToken } from '../api/access';
import { submitApplication, ApplicationEntry } from '../api/applications';
import { getPortalDisplay } from '../config/portalDisplay';
import { ApiError } from '../api/client';
import { LoadingBlock, ErrorBanner, InfoBanner } from '../components/Feedback';
import { DataCategoryTag } from '../components/StatusBadge';

interface NavState {
  accessTokenId: string;
  token: string;
}

/**
 * This screen plays the role of the GOVERNMENT PORTAL, not OTR. It never
 * calls fetchMyProfile() — it only ever has the opaque access token handed
 * to it once, at the moment consent was granted (via router state from
 * ConsentReviewPage). Everything it displays comes from
 * POST /api/access/data, already mapped into the portal's own field names.
 * This is the deliberate boundary described in
 * docs/ARCHITECTURE_DECISIONS.md: SSC retrieves authorized data from OTR;
 * OTR does not reach into SSC's form and fill it in.
 */
export default function ApplicationFormPage() {
  const { portalId: clientId } = useParams<{ portalId: string }>();
  const location = useLocation();
  const navState = location.state as NavState | null;

  const [client, setClient] = useState<GovernmentClient | null>(null);
  const [portalData, setPortalData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appFields, setAppFields] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [application, setApplication] = useState<ApplicationEntry | null>(null);
  const [admitCard, setAdmitCard] = useState<Record<string, unknown> | null>(null);
  const [generatingAdmitCard, setGeneratingAdmitCard] = useState(false);

  const display = clientId ? getPortalDisplay(clientId) : undefined;

  useEffect(() => {
    if (!navState?.token) {
      setError('No authorization on file for this session — start again from "Continue with OTR".');
      setLoading(false);
      return;
    }
    Promise.all([fetchGovernmentClients(), retrieveDataWithToken(navState.token)])
      .then(([clientsRes, dataRes]) => {
        setClient(clientsRes.entries.find((c) => c.clientId === clientId) ?? null);
        setPortalData(dataRes.data);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not retrieve authorized data.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  if (loading) return <LoadingBlock label="SSC is retrieving authorized data from OTR…" />;
  if (error) return <ErrorBanner message={error} />;
  if (!client || !portalData) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!client || !display) return;
    const missing = display.appSpecificFields.filter((f) => !appFields[f.key]);
    if (missing.length > 0) {
      setError(`Please fill in: ${missing.map((f) => f.label).join(', ')}`);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const record = await submitApplication({
        clientId: client.clientId,
        accessTokenId: navState?.accessTokenId,
        applicationName: `${client.name} application`,
        organisation: client.organisation,
        appSpecificData: appFields,
      });
      setApplication(record);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit the application.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGenerateAdmitCard() {
    if (!navState?.token) return;
    setGeneratingAdmitCard(true);
    try {
      // Demonstrates Part 10 step 11: the SAME token, presented again later
      // (here, seconds later; in the real world, potentially weeks later),
      // still works for a follow-up retrieval — proving the token is a
      // durable authorization reference, not a one-time value tied to the
      // original session.
      const res = await retrieveDataWithToken(navState.token);
      setAdmitCard(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not retrieve data for admit card generation.');
    } finally {
      setGeneratingAdmitCard(false);
    }
  }

  if (application) {
    return (
      <div className="card" style={{ maxWidth: 560, textAlign: 'center', padding: '2.5rem 1.5rem' }}>
        <h1>Application submitted</h1>
        <p>Your application to {client.name} has been recorded.</p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', color: 'var(--brand)', margin: '1rem 0' }}>
          {application.applicationRefId}
        </p>

        <InfoBanner>
          {client.name} stored this application together with a reference to the access token used — not a copy of
          your OTR profile. It can use that same token later (e.g. to generate an admit card) without asking you to
          re-authenticate.
        </InfoBanner>

        {!admitCard ? (
          <button className="btn btn-secondary" onClick={handleGenerateAdmitCard} disabled={generatingAdmitCard} style={{ marginTop: '1rem' }}>
            {generatingAdmitCard ? 'Retrieving…' : 'Simulate: generate admit card later using stored token'}
          </button>
        ) : (
          <div className="card" style={{ marginTop: '1rem', textAlign: 'left' }}>
            <h3 style={{ marginTop: 0 }}>Mock Admit Card — {client.name}</h3>
            {Object.entries(admitCard).map(([field, value]) => (
              <div key={field} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', padding: '0.3rem 0' }}>
                <span style={{ color: 'var(--neutral)' }}>{display?.portalFieldLabels[field] ?? field}</span>
                <span>{String(value)}</span>
              </div>
            ))}
            <p style={{ fontSize: '0.78rem', color: 'var(--neutral)', marginTop: '0.5rem' }}>
              Retrieved with the same access token, re-validated against its current status and expiry.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.25rem' }}>
          <Link to="/dashboard" className="btn btn-primary">View on dashboard</Link>
          <Link to="/portals" className="btn btn-secondary">Apply to another portal</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <h1>{client.name} application</h1>
      <p>{client.organisation}</p>

      {error && <ErrorBanner message={error} />}

      <InfoBanner>
        Everything in the section below arrived via {client.name}'s own request to{' '}
        <code>POST /api/access/data</code>, using the access token from your consent — not a direct read of your
        OTR profile. Field names shown are {client.name}'s own naming convention, distinct from OTR's canonical
        field names (this is the interoperability story: same underlying data, different portal-specific shape).
      </InfoBanner>

      <form onSubmit={handleSubmit}>
        <section className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h2 style={{ margin: 0 }}>Received from OTR (authorized fields only)</h2>
            <DataCategoryTag kind="reusable" />
          </div>
          <div className="grid-2">
            {Object.entries(portalData).map(([field, value]) => (
              <div className="field" key={field}>
                <label>{display?.portalFieldLabels[field] ?? field}</label>
                <input value={value === null || value === undefined ? '' : String(value)} disabled />
                <span style={{ fontSize: '0.72rem', color: 'var(--neutral)' }}>{client.name}'s field name: {field}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card" style={{ marginTop: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h2 style={{ margin: 0 }}>{client.name}-specific details</h2>
            <DataCategoryTag kind="app-specific" />
          </div>
          <p style={{ fontSize: '0.82rem' }}>Only used for this application — never added to your master OTR profile.</p>
          <div className="grid-2">
            {display?.appSpecificFields.map((f) => (
              <div className="field" key={f.key}>
                <label htmlFor={f.key}>{f.label}</label>
                {f.type === 'select' ? (
                  <select
                    id={f.key}
                    value={appFields[f.key] ?? ''}
                    onChange={(e) => setAppFields((s) => ({ ...s, [f.key]: e.target.value }))}
                  >
                    <option value="">Select…</option>
                    {f.options?.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={f.key}
                    value={appFields[f.key] ?? ''}
                    onChange={(e) => setAppFields((s) => ({ ...s, [f.key]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
        </section>

        <button className="btn btn-primary" type="submit" style={{ marginTop: '1.25rem' }} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit application'}
        </button>
      </form>
    </div>
  );
}
