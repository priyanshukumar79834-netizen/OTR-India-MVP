import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="container" style={{ paddingTop: '4rem', textAlign: 'center' }}>
      <h1>Page not found</h1>
      <p>The screen you're looking for doesn't exist.</p>
      <Link to="/profile" className="btn btn-primary">Back to your profile</Link>
    </div>
  );
}
