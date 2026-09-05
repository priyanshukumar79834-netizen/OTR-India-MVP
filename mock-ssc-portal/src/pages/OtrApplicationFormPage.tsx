import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { retrieveAuthorizedData, OtrApiError } from '../api/otr';
import { getPendingAuthorization, saveDraft } from '../api/sscStore';
import { EXAM_CENTRES, confirmedGroups } from '../config/fieldLabels';
import { LoadingBlock, ErrorBanner } from '../components/Feedback';
import { ApplicationWizard } from '../components/ApplicationWizard';

/**
 * Step 1 of the "Continue with OTR" journey: retrieve exactly the
 * citizen-authorized fields from OTR (via the opaque access token), then
 * collect the SSC-specific fields this application still needs. Clearly
 * separates "retrieved from OTR" from "entered on SSC" per the project
 * brief — SSC is retrieving authorized data, not autofilling a form OTR
 * controls.
 */
export default function OtrApplicationFormPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [otrData, setOtrData] = useState<Record<string, unknown> | null>(null);

  const [examCentre, setExamCentre] = useState(EXAM_CENTRES[0]);
  const [postPreference, setPostPreference] = useState('Junior Engineer (Civil)');

  useEffect(() => {
    const pending = getPendingAuthorization();
    if (!pending) {
      setError('No authorization found. Please start your application again.');
      setLoading(false);
      return;
    }
    retrieveAuthorizedData(pending.token)
      .then((res) => setOtrData(res.data))
      .catch((err) => {
        setError(err instanceof OtrApiError ? err.message : 'Could not retrieve your authorized details from OTR-India.');
      })
      .finally(() => setLoading(false));
  }, []);

  function handleContinue(e: FormEvent) {
    e.preventDefault();
    const pending = getPendingAuthorization();
    if (!pending || !otrData) return;

    saveDraft({
      method: 'OTR',
      token: pending.token,
      otrData,
      examCentre,
      postPreference,
      candidateName: String(otrData.candidate_name ?? 'Candidate'),
    });
    navigate('/apply/otr/review');
  }

  if (loading) return <LoadingBlock label="Retrieving your authorized details from OTR-India…" />;
  if (error) return <ErrorBanner message={error} />;
  if (!otrData) return null;

  return (
    <div style={{ maxWidth: 680 }}>
      <ApplicationWizard current="details" />
      <h1>Application Details</h1>

      <form onSubmit={handleContinue}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <span className="badge badge-ok">Details fetched successfully</span>
          </div>
          <p style={{ fontSize: '0.88rem' }}>
            Your authorized information has been securely retrieved from OTR-India and is ready to use for this
            application.
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0.75rem 0 0', display: 'grid', gap: '0.4rem' }}>
            {confirmedGroups(otrData).map((label) => (
              <li key={label} style={{ fontSize: '0.88rem' }}>
                ✓ {label}
              </li>
            ))}
          </ul>
          <p style={{ fontSize: '0.78rem', color: 'var(--neutral)', marginTop: '0.75rem', marginBottom: 0 }}>
            These details belong to your reusable OTR profile, not to this application. To correct them, update
            your profile on OTR-India.
          </p>
        </div>

        <div className="card" style={{ marginTop: '1.25rem' }}>
          <h2 style={{ marginTop: 0 }}>Enter on SSC</h2>
          <p style={{ fontSize: '0.82rem', marginTop: '-0.5rem' }}>
            These fields apply only to this GovRecruit-A application. They are not part of your OTR profile and
            will not affect it.
          </p>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="examCentre">Preferred Exam Centre</label>
              <select id="examCentre" value={examCentre} onChange={(e) => setExamCentre(e.target.value)}>
                {EXAM_CENTRES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="postPreference">Post Preference</label>
              <select id="postPreference" value={postPreference} onChange={(e) => setPostPreference(e.target.value)}>
                <option>Junior Engineer (Civil)</option>
                <option>Junior Engineer (Mechanical)</option>
                <option>Junior Engineer (Electrical)</option>
              </select>
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '1.25rem' }}>
          Continue to Review
        </button>
      </form>
    </div>
  );
}
