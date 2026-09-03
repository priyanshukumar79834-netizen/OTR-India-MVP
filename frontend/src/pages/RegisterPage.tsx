import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerCitizen } from '../api/auth';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await registerCitizen({ fullName, email, password });
      login(result.token, result.otrId);
      navigate('/profile', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 440, paddingTop: '4rem' }}>
      <h1>Create your OTR profile</h1>
      <p>Register once to reuse your information across participating government applications.</p>

      <form className="card" style={{ marginTop: '1.5rem' }} onSubmit={handleSubmit}>
        {error && <div className="banner banner-error" role="alert">{error}</div>}

        <div className="field">
          <label htmlFor="fullName">Full name</label>
          <input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="As per your records"
            required
            autoComplete="name"
          />
        </div>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="demo@example.com"
            required
            autoComplete="email"
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            required
            minLength={8}
            autoComplete="new-password"
          />
          <span className="field-hint">Used for this demo login only — not linked to Aadhaar or any government ID.</span>
        </div>

        <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create OTR account'}
        </button>
      </form>

      <p style={{ marginTop: '1.25rem', fontSize: '0.9rem' }}>
        Already registered? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}
