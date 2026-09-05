import { useEffect, useState } from 'react';

type Stage = 'permission' | 'positioning' | 'verifying' | 'success';

/**
 * Demo/mock identity check ONLY — see project brief §4/§9: no real
 * biometric recognition happens here. This simulates the on-screen shape
 * of a face-verification step (camera permission, positioning, a
 * verifying delay) so the application flow reads as complete, without
 * accessing the camera or performing any biometric matching.
 */
export function FaceVerificationMock({ onComplete }: { onComplete: () => void }) {
  const [stage, setStage] = useState<Stage>('permission');

  useEffect(() => {
    if (stage === 'positioning') {
      const t = window.setTimeout(() => setStage('verifying'), 1600);
      return () => window.clearTimeout(t);
    }
    if (stage === 'verifying') {
      const t = window.setTimeout(() => setStage('success'), 1800);
      return () => window.clearTimeout(t);
    }
    if (stage === 'success') {
      const t = window.setTimeout(onComplete, 900);
      return () => window.clearTimeout(t);
    }
  }, [stage, onComplete]);

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div className="banner banner-notice" style={{ textAlign: 'left' }}>
        Demo identity check only. This prototype does not access your camera or perform any real biometric
        verification.
      </div>

      <h2 style={{ marginTop: 0 }}>Identity Verification</h2>

      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: '50%',
          border: `3px solid ${stage === 'success' ? 'var(--ok)' : 'var(--navy)'}`,
          margin: '1.25rem auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--navy-tint)',
          fontSize: '2.4rem',
        }}
        aria-hidden
      >
        {stage === 'success' ? '✓' : '👤'}
      </div>

      {stage === 'permission' && (
        <>
          <p style={{ fontSize: '0.9rem' }}>
            GovRecruit-A (Mock) would like simulated camera access to verify your identity against your application
            photo. This is a demo step — no camera will actually be opened.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => setStage('positioning')}>
            Allow camera access (demo)
          </button>
        </>
      )}

      {stage === 'positioning' && (
        <p style={{ fontSize: '0.9rem' }}>
          <span className="spinner" aria-hidden style={{ marginRight: '0.5rem' }} />
          Position your face within the frame…
        </p>
      )}

      {stage === 'verifying' && (
        <p style={{ fontSize: '0.9rem' }}>
          <span className="spinner" aria-hidden style={{ marginRight: '0.5rem' }} />
          Verifying identity…
        </p>
      )}

      {stage === 'success' && <p style={{ fontSize: '0.9rem', color: 'var(--ok)', fontWeight: 700 }}>Verification successful</p>}
    </div>
  );
}
