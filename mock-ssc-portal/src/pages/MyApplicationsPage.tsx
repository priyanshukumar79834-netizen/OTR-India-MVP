import { Link } from 'react-router-dom';
import { listApplications } from '../api/sscStore';

export default function MyApplicationsPage() {
  const applications = listApplications();

  return (
    <div>
      <h1>My Applications</h1>
      <p>Applications you have submitted to GovRecruit-A.</p>

      {applications.length === 0 ? (
        <div className="card">
          <p>You haven't submitted any applications yet.</p>
          <Link to="/apply" className="btn btn-primary">
            Apply Now
          </Link>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', fontSize: '0.78rem', color: 'var(--neutral)' }}>
                <th style={{ padding: '0.9rem 1.1rem' }}>Reference No.</th>
                <th>Method</th>
                <th>Post Preference</th>
                <th>Centre</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {applications.map((a) => (
                <tr key={a.applicationRefId} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.75rem 1.1rem' }} className="ref-number">
                    {a.applicationRefId}
                  </td>
                  <td>
                    <span className={a.method === 'OTR' ? 'badge badge-ok' : 'badge badge-neutral'}>
                      {a.method === 'OTR' ? 'Via OTR' : 'Manual'}
                    </span>
                  </td>
                  <td>{a.postPreference}</td>
                  <td>{a.examCentre}</td>
                  <td>
                    <span className="badge badge-ok">{a.status}</span>
                  </td>
                  <td style={{ padding: '0.75rem 1.1rem', textAlign: 'right' }}>
                    <Link to={`/applications/${a.applicationRefId}`} className="btn btn-secondary" style={{ padding: '0.35em 0.9em', fontSize: '0.82rem' }}>
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
