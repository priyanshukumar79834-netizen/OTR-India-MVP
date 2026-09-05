import { useState } from 'react';

/**
 * Demo/mock payment step ONLY — see project brief §4/§9: no real payment
 * gateway is integrated. This simulates the shape of an examination-fee
 * payment (amount, a demo instrument choice, a processing delay) purely
 * for narrative completeness in the prototype. Nothing here contacts any
 * payment network.
 */
export function PaymentMock({ amount, onComplete }: { amount: number; onComplete: () => void }) {
  const [method, setMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [status, setStatus] = useState<'idle' | 'processing' | 'success'>('idle');

  function handlePay() {
    setStatus('processing');
    window.setTimeout(() => {
      setStatus('success');
      window.setTimeout(onComplete, 700);
    }, 1400);
  }

  if (status === 'success') {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'var(--ok-tint)',
            color: 'var(--ok)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
            marginBottom: '0.75rem',
          }}
        >
          ✓
        </div>
        <h2 style={{ marginTop: 0 }}>Payment successful (demo)</h2>
        <p style={{ fontSize: '0.88rem' }}>Continuing to face verification…</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="banner banner-notice">
        Demo payment only. No real payment gateway is used in this prototype — nothing is actually charged.
      </div>

      <h2 style={{ marginTop: 0 }}>Examination Fee</h2>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: '0.9rem' }}>Application fee</span>
        <strong>₹{amount}.00</strong>
      </div>

      <div style={{ marginTop: '1.1rem' }}>
        <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--ink-soft)', display: 'block', marginBottom: '0.5rem' }}>
          Choose a payment method (demo)
        </label>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          {(['upi', 'card', 'netbanking'] as const).map((m) => (
            <button
              key={m}
              type="button"
              className={method === m ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ padding: '0.5em 1em', fontSize: '0.85rem' }}
              onClick={() => setMethod(m)}
              disabled={status === 'processing'}
            >
              {m === 'upi' ? 'UPI' : m === 'card' ? 'Debit/Credit Card' : 'Net Banking'}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="btn btn-primary btn-block"
        style={{ marginTop: '1.5rem' }}
        onClick={handlePay}
        disabled={status === 'processing'}
      >
        {status === 'processing' ? (
          <>
            <span className="spinner" aria-hidden /> Processing payment…
          </>
        ) : (
          `Pay ₹${amount}.00 (Demo)`
        )}
      </button>
    </div>
  );
}
