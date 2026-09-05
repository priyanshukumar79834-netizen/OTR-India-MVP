import { useNavigate } from 'react-router-dom';
import { getDraft } from '../api/sscStore';
import { confirmedGroups } from '../config/fieldLabels';
import { ApplicationWizard } from '../components/ApplicationWizard';
import { ErrorBanner } from '../components/Feedback';

export default function OtrReviewPage() {
  const navigate = useNavigate();
  const draft = getDraft();

  if (!draft || draft.method !== 'OTR') {
    return (
      <div style={{ maxWidth: 640 }}>
        <ErrorBanner message="No application in progress. Please start again from Apply Now." />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <ApplicationWizard current="review" />
      <h1>Review Your Application</h1>
      <p>Check the details below before proceeding to payment.</p>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h2 style={{ margin: 0 }}>From your OTR profile</h2>
          <span className="badge badge-ok">Details fetched successfully</span>
        </div>
        <p style={{ fontSize: '0.82rem', marginTop: '-0.25rem' }}>
          The categories below were securely retrieved from OTR-India with your consent. Values aren't repeated
          here — they're part of your reusable OTR profile, not this application.
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: '0.5rem 0 0', display: 'grid', gap: '0.35rem' }}>
          {confirmedGroups(draft.otrData).map((label) => (
            <li key={label} style={{ fontSize: '0.88rem' }}>
              ✓ {label}
            </li>
          ))}
        </ul>
      </div>

      <div className="card" style={{ marginTop: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h2 style={{ margin: 0 }}>Entered on SSC</h2>
          <span className="badge badge-neutral">Application-specific</span>
        </div>
        <div className="grid-2">
          <div style={{ fontSize: '0.88rem', padding: '0.35rem 0' }}>
            <div style={{ color: 'var(--neutral)', fontSize: '0.72rem' }}>Preferred Exam Centre</div>
            <div>{draft.examCentre}</div>
          </div>
          <div style={{ fontSize: '0.88rem', padding: '0.35rem 0' }}>
            <div style={{ color: 'var(--neutral)', fontSize: '0.72rem' }}>Post Preference</div>
            <div>{draft.postPreference}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/apply/otr/form')}>
          Edit details
        </button>
        <button type="button" className="btn btn-primary btn-block" onClick={() => navigate('/apply/otr/payment')}>
          Proceed to Payment
        </button>
      </div>
    </div>
  );
}
