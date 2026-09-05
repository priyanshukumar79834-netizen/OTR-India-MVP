import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * OTR-India's public front page — the first thing a visitor sees, before
 * any login. Distinct from the authenticated app shell: this page exists
 * to explain the model (reusable data + consent + interoperability), not
 * to manage a profile. See project brief: "Your reusable citizen
 * information, available to authorized government services with your
 * consent."
 */
export default function LandingPage() {
  const { isAuthenticated, otrId } = useAuth();

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <header className="landing-header">
        <div className="row">
          <Link to="/" className="landing-wordmark">
            <span className="mark">OTR</span>
            <span className="word">OTR-India</span>
          </Link>
          <nav className="landing-nav">
            <a href="#how-it-works" className="nav-link">
              How it works
            </a>
            <a href="#data-model" className="nav-link">
              What OTR stores
            </a>
            <a href="#for-services" className="nav-link">
              For government services
            </a>
            {isAuthenticated ? (
              <Link to="/profile" className="btn btn-primary">
                Go to my profile
              </Link>
            ) : (
              <Link to="/login" className="btn btn-primary">
                Access OTR
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        <section className="landing-shell landing-hero">
          <div>
            <h1>One registration. Reused only with your say-so.</h1>
            <p className="lede">
              OTR-India keeps your reusable citizen information — identity, contact, address, education,
              credentials — in one place you control. When a government service needs some of it, you decide
              exactly what to share, once, per request.
            </p>
            <div className="landing-cta-row">
              {isAuthenticated ? (
                <Link to="/dashboard" className="btn btn-primary">
                  Open my dashboard
                </Link>
              ) : (
                <>
                  <Link to="/register" className="btn btn-primary">
                    Create your OTR profile
                  </Link>
                  <Link to="/login" className="btn btn-secondary">
                    Log in
                  </Link>
                </>
              )}
            </div>
            {isAuthenticated && otrId && (
              <p style={{ fontSize: '0.82rem', marginTop: '1rem', fontFamily: 'var(--font-mono)' }}>
                Signed in as {otrId}
              </p>
            )}
          </div>

          <div className="landing-hero-panel" aria-hidden>
            <div className="panel-head">
              <span>SSC Examination Portal is requesting access</span>
              <span style={{ fontWeight: 500, opacity: 0.85 }}>Preview</span>
            </div>
            <div className="panel-body">
              <p style={{ fontSize: '0.82rem', marginTop: 0 }}>
                This service is asking to access the following from your OTR profile:
              </p>
              {['Name access', 'Date of birth access', 'Mobile number access', 'Address access', 'Education access'].map(
                (row) => (
                  <div className="grant-row" key={row}>
                    <span>{row}</span>
                    <span style={{ color: 'var(--reusable)', fontWeight: 700 }}>✓</span>
                  </div>
                )
              )}
              <p style={{ fontSize: '0.76rem', color: 'var(--neutral)', marginBottom: 0 }}>
                Nothing else on your profile is shared. You approve every request individually.
              </p>
            </div>
          </div>
        </section>

        <section className="landing-section" id="how-it-works">
          <div className="landing-shell">
            <div className="section-head">
              <h2>How it works</h2>
              <p>The same four steps, whichever government service you're applying to.</p>
            </div>
            <div className="landing-steps">
              <div className="landing-step">
                <span className="num">01</span>
                <h3>Register once</h3>
                <p>Create your OTR profile with your basic details, education, and credentials.</p>
              </div>
              <div className="landing-step">
                <span className="num">02</span>
                <h3>A service asks</h3>
                <p>
                  A participating government portal — say, an exam application — asks to use your OTR
                  information instead of collecting it again.
                </p>
              </div>
              <div className="landing-step">
                <span className="num">03</span>
                <h3>You review and consent</h3>
                <p>OTR shows exactly which categories of information are requested, and why. You approve or decline.</p>
              </div>
              <div className="landing-step">
                <span className="num">04</span>
                <h3>Only that data moves</h3>
                <p>
                  The service receives only what you approved, through a secure, time-limited authorization —
                  never your whole profile.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section" id="data-model">
          <div className="landing-shell">
            <div className="section-head">
              <h2>What OTR stores, and what stays elsewhere</h2>
              <p>OTR is not one giant database that replaces every government system — it's a reusable layer for what genuinely repeats across applications.</p>
            </div>
            <div className="landing-categories">
              <div className="landing-category reusable">
                <span className="tag">Reusable</span>
                <h3>Your profile</h3>
                <p>Name, date of birth, guardian's name, contact details, and address — entered once, reused across services with your consent.</p>
              </div>
              <div className="landing-category credential">
                <span className="tag">Credential</span>
                <h3>Education & documents</h3>
                <p>10th, 12th, and other records, each clearly marked as citizen-provided or verified. Uploading a document never marks it verified automatically.</p>
              </div>
              <div className="landing-category app">
                <span className="tag">Application-specific</span>
                <h3>What stays with the service</h3>
                <p>Exam centre, post preference, and other one-off choices stay with the service that collected them — they never enter your OTR profile.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section" id="for-services">
          <div className="landing-shell">
            <div className="section-head">
              <h2>Built as a bridge between services, not a replacement for them</h2>
              <p>Every government service keeps its own systems and its own application process.</p>
            </div>
            <div className="landing-principle-list">
              <div className="landing-principle">
                <span className="label">Consent-controlled</span>
                <p>No data moves anywhere without an explicit, per-request approval from the citizen.</p>
              </div>
              <div className="landing-principle">
                <span className="label">Scoped access</span>
                <p>A service can never receive more fields than it's registered to request and you approved — enforced on OTR's servers, not just shown in the interface.</p>
              </div>
              <div className="landing-principle">
                <span className="label">Interoperable, not identical</span>
                <p>Different services can use different field names and formats internally; OTR maps between its own canonical model and each service's format.</p>
              </div>
              <div className="landing-principle">
                <span className="label">Traceable</span>
                <p>Every consent decision and every data access is recorded and visible to you on your dashboard.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="row">
          <span>OTR-India — a Smart India Hackathon prototype for problem statement SIH26129.</span>
          <span>Not affiliated with any real government identity system.</span>
        </div>
      </footer>
    </div>
  );
}
