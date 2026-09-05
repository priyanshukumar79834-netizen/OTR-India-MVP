import { useState } from 'react';
import { Link } from 'react-router-dom';
import { buildAuthorizeUrl } from '../api/otr';
import { NoticeBanner } from '../components/Feedback';

/**
 * This is the real cross-site handoff. Clicking the button performs a
 * full browser navigation (`window.location.href`, not a React Router
 * link) away from this origin entirely, to OTR-India's own website. This
 * app never opens OTR in an iframe and never simulates its screens —
 * the citizen genuinely leaves GovRecruit-A and arrives on OTR.
 */
export default function OtrIntroPage() {
  const [redirecting, setRedirecting] = useState(false);

  function handleContinueWithOtr() {
    setRedirecting(true);
    const redirectUri = `${window.location.origin}/callback`;
    const authorizeUrl = buildAuthorizeUrl({ redirectUri, purpose: 'Junior Engineer Recruitment 2026 application' });
    window.location.href = authorizeUrl;
  }

  if (redirecting) {
    return (
      <div className="redirect-screen">
        <span className="spinner" aria-hidden />
        <p>Redirecting you to OTR-India to review and authorize this request…</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <p style={{ fontSize: '0.85rem' }}>
        <Link to="/apply" style={{ color: 'var(--neutral)' }}>
          ← Choose a different way to apply
        </Link>
      </p>
      <h1>Continue with OTR</h1>
      <p>
        GovRecruit-A needs some basic details to process your application: full name, date of birth, guardian's
        name, mobile number, address, and your 10th/12th qualification records.
      </p>

      <NoticeBanner>
        You can provide these details using your OTR-India profile instead of typing them again. Clicking below
        will take you to OTR-India's own website, where you'll review exactly what GovRecruit-A is asking for and
        decide whether to share it.
      </NoticeBanner>

      <div className="card" style={{ marginTop: '1rem' }}>
        <h3 style={{ marginTop: 0 }}>Continue with OTR-India</h3>
        <p style={{ fontSize: '0.88rem' }}>
          You will be redirected to <strong>OTR-India</strong> — a separate website — to log in (if needed) and
          authorize this specific request. GovRecruit-A will receive only the fields you approve, nothing more.
        </p>
        <button className="btn btn-primary" onClick={handleContinueWithOtr}>
          Continue with OTR
        </button>
      </div>
    </div>
  );
}
