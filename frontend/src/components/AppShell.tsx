import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/profile', label: 'OTR Profile' },
  { to: '/credentials', label: 'Credentials' },
  { to: '/dashboard', label: 'Dashboard' },
];

export default function AppShell() {
  const { otrId, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          className="container"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <span style={{ fontWeight: 750, color: 'var(--brand)', letterSpacing: '-0.02em' }}>
              OTR-India
            </span>
            <nav style={{ display: 'flex', gap: '1.1rem' }}>
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  style={({ isActive }) => ({
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    color: isActive ? 'var(--brand)' : 'var(--ink-soft)',
                    borderBottom: isActive ? '2px solid var(--brand)' : '2px solid transparent',
                    paddingBottom: 4,
                  })}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
            {otrId && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--neutral)' }}>
                {otrId}
              </span>
            )}
            <button className="btn btn-secondary" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="container" style={{ padding: '2rem 1.25rem 4rem', flex: 1, width: '100%' }}>
        <Outlet />
      </main>
    </div>
  );
}
