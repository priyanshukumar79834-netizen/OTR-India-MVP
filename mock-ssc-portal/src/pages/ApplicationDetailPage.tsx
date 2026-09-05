import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getApplication } from '../api/sscStore';
import { retrieveAuthorizedData, OtrApiError, PortalDataResponse } from '../api/otr';
import { formatFieldValue, OTR_FIELD_LABELS } from '../config/fieldLabels';
import { ErrorBanner, InfoBanner } from '../components/Feedback';

/**
 * For OTR-authorized applications, this demonstrates that the access
 * token is a durable, reusable authorization — not a one-time handoff.
 * GovRecruit-A calls OTR's /api/access/data AGAIN here, days after the
 * original application, using the same token it stored at submission
 * time. No new consent screen, no re-authorization — this is what makes
 * OTR an interoperability layer rather than an autofill shortcut
 * (MASTER_SPECIFICATION.md §12).
 *
 * Manual applications have no OTR authorization to reuse at all — their
 * admit card is generated straight from what the candidate typed here,
 * with no OTR involvement, which is itself worth showing plainly: it's
 * the same portal-side outcome, reached a different way.
 */
export default function ApplicationDetailPage() {
  const { refId } = useParams();
  const application = refId ? getApplication(refId) : undefined;

  const [admitCardData, setAdmitCardData] = useState<PortalDataResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualAdmitCardGenerated, setManualAdmitCardGenerated] = useState(false);

  if (!application) {
    return (
      <div>
        <ErrorBanner message="No such application found in this browser's records." />
        <Link to="/applications" className="btn btn-secondary">
          Back to My Applications
        </Link>
      </div>
    );
  }

  async function handleGenerateAdmitCard() {
    if (application!.method === 'MANUAL') {
      setManualAdmitCardGenerated(true);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await retrieveAuthorizedData(application!.otrAccessToken!);
      setAdmitCardData(result);
    } catch (err) {
      setError(
        err instanceof OtrApiError
          ? `Could not retrieve your details from OTR-India: ${err.message}`
          : 'Could not retrieve your details from OTR-India.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <h1>Application Submitted</h1>
      <InfoBanner>
        Your application reference number is <span className="ref-number">{application.applicationRefId}</span>.
        Keep this for future correspondence.
      </InfoBanner>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 style={{ margin: 0 }}>Summary</h2>
          <span className={application.method === 'OTR' ? 'badge badge-ok' : 'badge badge-neutral'}>
            {application.method === 'OTR' ? 'Applied via OTR' : 'Applied manually'}
          </span>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Reference Number</label>
            <input value={application.applicationRefId} disabled readOnly className="ref-number" />
          </div>
          <div className="field">
            <label>Status</label>
            <input value={application.status} disabled readOnly />
          </div>
          <div className="field">
            <label>Post Preference</label>
            <input value={application.postPreference} disabled readOnly />
          </div>
          <div className="field">
            <label>Exam Centre</label>
            <input value={application.examCentre} disabled readOnly />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.25rem' }}>
        <h2 style={{ marginTop: 0 }}>Admit Card</h2>
        {application.method === 'OTR' ? (
          <p style={{ fontSize: '0.88rem' }}>
            Closer to the exam date, GovRecruit-A generates your admit card using your OTR-authorized details — no
            need to log in to OTR again or re-approve the request. This shows the same authorization from your
            application being reused later, which is the reusability OTR-India is designed for.
          </p>
        ) : (
          <p style={{ fontSize: '0.88rem' }}>
            This application was submitted manually, so the admit card is generated from the details you entered
            directly on GovRecruit-A — no OTR authorization is involved.
          </p>
        )}

        {error && <ErrorBanner message={error} />}

        {application.method === 'OTR' && !admitCardData && (
          <button className="btn btn-primary" onClick={handleGenerateAdmitCard} disabled={loading}>
            {loading ? 'Retrieving from OTR-India…' : 'Generate Admit Card (demo)'}
          </button>
        )}
        {application.method === 'MANUAL' && !manualAdmitCardGenerated && (
          <button className="btn btn-primary" onClick={handleGenerateAdmitCard}>
            Generate Admit Card (demo)
          </button>
        )}

        {admitCardData && (
          <div style={{ border: '2px solid var(--navy)', borderRadius: 'var(--radius)', padding: '1rem', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <strong style={{ fontFamily: 'var(--font)' }}>Admit Card — {application.applicationRefId}</strong>
              <span className="badge badge-ok">Retrieved live from OTR</span>
            </div>
            <div className="grid-2">
              {Object.entries(admitCardData.data).map(([field, value]) => (
                <div key={field} style={{ fontSize: '0.88rem', padding: '0.3rem 0' }}>
                  <div style={{ color: 'var(--neutral)', fontSize: '0.72rem' }}>{OTR_FIELD_LABELS[field] ?? field}</div>
                  <div>{formatFieldValue(value)}</div>
                </div>
              ))}
              <div style={{ fontSize: '0.88rem', padding: '0.3rem 0' }}>
                <div style={{ color: 'var(--neutral)', fontSize: '0.72rem' }}>Exam Centre</div>
                <div>{application.examCentre}</div>
              </div>
            </div>
          </div>
        )}

        {manualAdmitCardGenerated && (
          <div style={{ border: '2px solid var(--navy)', borderRadius: 'var(--radius)', padding: '1rem', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <strong style={{ fontFamily: 'var(--font)' }}>Admit Card — {application.applicationRefId}</strong>
              <span className="badge badge-neutral">From manually entered details</span>
            </div>
            <div className="grid-2">
              <div style={{ fontSize: '0.88rem', padding: '0.3rem 0' }}>
                <div style={{ color: 'var(--neutral)', fontSize: '0.72rem' }}>Candidate Name</div>
                <div>{application.candidateName}</div>
              </div>
              <div style={{ fontSize: '0.88rem', padding: '0.3rem 0' }}>
                <div style={{ color: 'var(--neutral)', fontSize: '0.72rem' }}>Exam Centre</div>
                <div>{application.examCentre}</div>
              </div>
              <div style={{ fontSize: '0.88rem', padding: '0.3rem 0' }}>
                <div style={{ color: 'var(--neutral)', fontSize: '0.72rem' }}>Post Preference</div>
                <div>{application.postPreference}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Link to="/applications" className="btn btn-secondary" style={{ marginTop: '1.25rem' }}>
        Back to My Applications
      </Link>
    </div>
  );
}
