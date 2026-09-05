import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div>
      <div className="banner banner-notice">
        <strong>Notice:</strong> Online applications for Junior Engineer Recruitment Examination 2026 are now open.
        Candidates are advised to read the detailed notification before applying.
      </div>

      <div className="card" style={{ background: 'var(--navy)', color: '#fff', border: 'none' }}>
        <div style={{ fontSize: '0.78rem', color: '#a9bcd8', fontWeight: 700, marginBottom: '0.4rem' }}>
          Advt. No. GR-A/JE/2026/03
        </div>
        <h1 style={{ color: '#fff', marginBottom: '0.5rem' }}>Junior Engineer Recruitment Examination 2026</h1>
        <p style={{ color: '#dbe3f0', maxWidth: 640 }}>
          The Staff Selection Commission (Mock) invites online applications from eligible candidates for the
          post of Junior Engineer across regional offices. Applications close 30 September 2026.
        </p>
        <Link to="/apply" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Apply Now
        </Link>
      </div>

      <div className="grid-2" style={{ marginTop: '1.5rem', gap: '1.25rem' }}>
        <div className="card">
          <h3>Eligibility</h3>
          <p style={{ fontSize: '0.9rem' }}>
            Candidates must hold a recognised Diploma/Degree in Engineering (Civil, Mechanical, or Electrical) and
            meet the age criteria specified in the official notification (18–30 years, relaxation as per category).
          </p>
        </div>
        <div className="card">
          <h3>Important Dates</h3>
          <table style={{ width: '100%', fontSize: '0.88rem', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '0.25rem 0', color: 'var(--neutral)' }}>Applications open</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>1 Sep 2026</td>
              </tr>
              <tr>
                <td style={{ padding: '0.25rem 0', color: 'var(--neutral)' }}>Last date to apply</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>30 Sep 2026</td>
              </tr>
              <tr>
                <td style={{ padding: '0.25rem 0', color: 'var(--neutral)' }}>Fee payment last date</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>2 Oct 2026</td>
              </tr>
              <tr>
                <td style={{ padding: '0.25rem 0', color: 'var(--neutral)' }}>Tentative exam date</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>November 2026</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.25rem' }}>
        <h3 style={{ marginTop: 0 }}>Application Process</h3>
        <ol style={{ fontSize: '0.9rem', paddingLeft: '1.1rem', margin: 0 }}>
          <li style={{ marginBottom: '0.4rem' }}>Register or provide candidate details (manually, or via your OTR profile).</li>
          <li style={{ marginBottom: '0.4rem' }}>Fill in examination centre and post preferences.</li>
          <li style={{ marginBottom: '0.4rem' }}>Review your application and pay the examination fee.</li>
          <li style={{ marginBottom: '0.4rem' }}>Complete identity verification.</li>
          <li>Submit and note your application reference number for future correspondence.</li>
        </ol>
      </div>

      <div className="card" style={{ marginTop: '1.25rem', borderColor: 'var(--navy)' }}>
        <h3 style={{ marginTop: 0 }}>Applying with your OTR profile</h3>
        <p style={{ fontSize: '0.9rem' }}>
          If you already have a One-Time Registration (OTR) profile, GovRecruit-A can securely retrieve your
          basic details — name, date of birth, contact information, and qualifications — directly from OTR once
          you review and approve the request. You will not need to re-type this information here. GovRecruit-A
          only ever receives the specific fields you authorize; nothing else from your OTR profile is shared.
          You can still apply manually instead if you prefer.
        </p>
      </div>

      <div className="grid-2" style={{ marginTop: '1.25rem', gap: '1.25rem' }}>
        <div className="card">
          <h3>Candidate Login</h3>
          <p style={{ fontSize: '0.88rem' }}>Already applied? Track the status of your submitted applications.</p>
          <Link to="/applications" className="btn btn-secondary">
            My Applications
          </Link>
        </div>
        <div className="card">
          <h3>Help & Support</h3>
          <p style={{ fontSize: '0.88rem' }}>
            For queries regarding this examination, contact the regional helpdesk during office hours
            (10:00–17:00, Mon–Fri). This is a demonstration portal — no real support line exists.
          </p>
        </div>
      </div>
    </div>
  );
}
