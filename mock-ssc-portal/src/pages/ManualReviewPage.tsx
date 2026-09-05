import { useNavigate } from 'react-router-dom';
import { getDraft } from '../api/sscStore';
import { ApplicationWizard } from '../components/ApplicationWizard';
import { ErrorBanner } from '../components/Feedback';

export default function ManualReviewPage() {
  const navigate = useNavigate();
  const draft = getDraft();

  if (!draft || draft.method !== 'MANUAL') {
    return (
      <div style={{ maxWidth: 640 }}>
        <ErrorBanner message="No application in progress. Please start again from Apply Now." />
      </div>
    );
  }

  const rows: [string, string][] = [
    ['Full Name', draft.fullName],
    ['Date of Birth', draft.dateOfBirth],
    ['Gender', draft.gender],
    ["Guardian's Name", draft.guardianName],
    ['Mobile Number', draft.mobile],
    ['Email Address', draft.email],
    ['Address', `${draft.addressLine}, ${draft.city}, ${draft.state} - ${draft.pincode}`],
    ['10th Qualification', draft.qualification10th],
    ['12th Qualification', draft.qualification12th],
    ['Preferred Exam Centre', draft.examCentre],
    ['Post Preference', draft.postPreference],
  ];

  return (
    <div style={{ maxWidth: 680 }}>
      <ApplicationWizard current="review" />
      <h1>Review Your Application</h1>
      <p>Check the details below before proceeding to payment.</p>

      <div className="card">
        <div className="grid-2">
          {rows.map(([label, value]) => (
            <div key={label} style={{ fontSize: '0.88rem', padding: '0.35rem 0' }}>
              <div style={{ color: 'var(--neutral)', fontSize: '0.72rem' }}>{label}</div>
              <div>{value || '—'}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/apply/manual')}>
          Edit details
        </button>
        <button type="button" className="btn btn-primary btn-block" onClick={() => navigate('/apply/manual/payment')}>
          Proceed to Payment
        </button>
      </div>
    </div>
  );
}
