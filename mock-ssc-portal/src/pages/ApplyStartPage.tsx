import { Link } from 'react-router-dom';

/**
 * The fork in the road (project brief Batch 4): before any form appears,
 * the candidate chooses how they want to supply their details. Neither
 * path is presented as the "real" one — both lead to a genuine,
 * completable application.
 */
export default function ApplyStartPage() {
  return (
    <div style={{ maxWidth: 760 }}>
      <h1>Junior Engineer Recruitment — Application</h1>
      <p>How would you like to apply?</p>

      <div className="grid-2" style={{ gap: '1.25rem', marginTop: '1rem' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ marginTop: 0 }}>Manual Form Fill</h2>
          <p style={{ fontSize: '0.9rem', flex: 1 }}>
            Enter your personal, contact, address, and education details yourself, directly on this site.
          </p>
          <Link to="/apply/manual" className="btn btn-secondary btn-block">
            Fill the form manually
          </Link>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', borderColor: 'var(--navy)' }}>
          <h2 style={{ marginTop: 0 }}>Continue with OTR</h2>
          <p style={{ fontSize: '0.9rem', flex: 1 }}>
            Authorize GovRecruit-A to retrieve your basic details from your OTR-India profile — name, date of
            birth, contact, address, and qualifications — instead of typing them again.
          </p>
          <Link to="/apply/otr" className="btn btn-primary btn-block">
            Continue with OTR
          </Link>
        </div>
      </div>

      <p style={{ fontSize: '0.82rem', color: 'var(--neutral)', marginTop: '1.25rem' }}>
        Both options lead to the same examination-fee payment and identity verification steps, and produce the
        same kind of application reference number.
      </p>
    </div>
  );
}
