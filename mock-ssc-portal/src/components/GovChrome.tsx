import { Link, Outlet } from 'react-router-dom';

export function GovHeader() {
  return (
    <header className="gov-header">
      <div className="top-strip">
        <div className="container">Government of India · Staff Selection Commission (Simulated / Mock Portal for demonstration)</div>
      </div>
      <div className="container brand-row">
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="emblem">
            <div className="emblem-badge">SSC</div>
            <div className="brand-text">
              <div className="name">GovRecruit-A</div>
              <div className="subtitle">Staff Selection Commission — Recruitment Portal</div>
            </div>
          </div>
        </Link>
      </div>
      <div className="container">
        <nav className="gov-nav">
          <Link to="/">Home</Link>
          <Link to="/apply">Apply Now</Link>
          <Link to="/applications">My Applications</Link>
        </nav>
      </div>
    </header>
  );
}

export function GovFooter() {
  return (
    <footer className="gov-footer">
      <div className="container">
        GovRecruit-A is a simulated government examination portal built for the OTR-India SIH prototype
        (PS 26129). It is not affiliated with the real Staff Selection Commission. It never shares a database,
        server, or session with OTR-India — it retrieves only citizen-authorized data through OTR's public API.
      </div>
    </footer>
  );
}

export default function GovLayout() {
  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <GovHeader />
      <main className="container" style={{ padding: '2rem 1.25rem 3rem', flex: 1, width: '100%' }}>
        <Outlet />
      </main>
      <GovFooter />
    </div>
  );
}
