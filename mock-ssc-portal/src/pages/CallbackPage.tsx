import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { savePendingAuthorization } from '../api/sscStore';
import { LoadingBlock, ErrorBanner } from '../components/Feedback';

/**
 * The other half of the cross-site handoff. OTR redirects the citizen's
 * browser back here after they approve or cancel. On approval, the
 * opaque access token arrives in the URL FRAGMENT (`#token=...`) — never
 * sent to any server, including this one, as part of the navigation
 * itself. We read it client-side with `window.location.hash` and
 * immediately move it into sessionStorage, then continue to the
 * application form which is what actually calls OTR's API with it.
 */
export default function CallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const search = new URLSearchParams(window.location.search);

    if (search.get('denied') === 'true') {
      setError('You did not authorize OTR-India to share your details with GovRecruit-A, so your application was not started.');
      return;
    }

    const token = hash.get('token');
    const clientId = hash.get('clientId');
    const expiresAt = hash.get('expiresAt');

    if (!token || !clientId || !expiresAt) {
      setError('This does not look like a valid response from OTR-India. Please start again from Apply Now.');
      return;
    }

    savePendingAuthorization({ token, clientId, expiresAt });
    // Clear the token out of the visible URL/history immediately.
    window.history.replaceState(null, '', '/callback');
    navigate('/apply/otr/form', { replace: true });
  }, [navigate]);

  if (error) {
    return (
      <div style={{ maxWidth: 560 }}>
        <ErrorBanner message={error} />
        <Link to="/apply" className="btn btn-secondary">
          Back to Apply
        </Link>
      </div>
    );
  }

  return <LoadingBlock label="Returning from OTR-India, retrieving your authorized details…" />;
}
