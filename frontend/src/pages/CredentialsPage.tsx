import { FormEvent, useEffect, useState } from 'react';
import { fetchMyProfile } from '../api/profile';
import { fetchMyDocuments, uploadDocument, DocumentEntry } from '../api/documents';
import { CanonicalCredential } from '../types';
import { ApiError } from '../api/client';
import { LoadingBlock, ErrorBanner } from '../components/Feedback';
import { CredentialStatusBadge } from '../components/StatusBadge';

export default function CredentialsPage() {
  const [credentials, setCredentials] = useState<CanonicalCredential[] | null>(null);
  const [documents, setDocuments] = useState<DocumentEntry[]>([]);
  const [credentialType, setCredentialType] = useState('');
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const [profile, docsRes] = await Promise.all([fetchMyProfile(), fetchMyDocuments()]);
      setCredentials(profile.credentials);
      setDocuments(docsRes.entries);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load credentials.');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!credentialType || !fileName) return;
    setUploading(true);
    setError(null);
    try {
      await uploadDocument({ documentType: credentialType, fileName, saveToProfile: true });
      setCredentialType('');
      setFileName('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  if (!credentials) return <LoadingBlock label="Loading credentials…" />;

  return (
    <div>
      <h1>Credentials &amp; Documents</h1>
      <p>Verification status here reflects what the issuing source has confirmed — not what you've uploaded.</p>

      {error && <ErrorBanner message={error} />}

      <section className="card">
        <h2>Your credentials</h2>
        {credentials.length === 0 ? (
          <p style={{ color: 'var(--neutral)' }}>No credentials on file yet — upload a document below to add one.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {credentials.map((c) => (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 0',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{c.type}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--neutral)' }}>
                    Issuer: {c.issuer}
                    {c.reference && ` · Ref: ${c.reference}`}
                  </div>
                </div>
                <CredentialStatusBadge status={c.verificationStatus} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card" style={{ marginTop: '1.25rem' }}>
        <h2>Upload a document</h2>
        <p style={{ fontSize: '0.85rem' }}>
          Simplified for the prototype — records document metadata; doesn't store real file bytes. Creates a{' '}
          <em>User Provided</em> credential, never automatically Verified (that's an issuer's job, simulated here).
        </p>
        <form onSubmit={handleUpload}>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="credType">Credential type</label>
              <input
                id="credType"
                value={credentialType}
                onChange={(e) => setCredentialType(e.target.value)}
                placeholder="e.g. Caste Certificate"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="fileName">File name</label>
              <input
                id="fileName"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="e.g. caste_certificate.pdf"
                required
              />
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={uploading}>
            {uploading ? 'Uploading…' : 'Upload document'}
          </button>
        </form>

        {documents.length > 0 && (
          <div style={{ marginTop: '1.25rem' }}>
            <h3>Uploaded documents</h3>
            <ul style={{ paddingLeft: '1.1rem' }}>
              {documents.map((d) => (
                <li key={d.id} style={{ marginBottom: '0.35rem', fontSize: '0.9rem' }}>
                  {d.fileName} <span style={{ color: 'var(--neutral)' }}>— {d.documentType}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
