export type WizardStepKey = 'details' | 'review' | 'payment' | 'verify' | 'done';

const STEPS: { key: WizardStepKey; label: string }[] = [
  { key: 'details', label: 'Application Details' },
  { key: 'review', label: 'Review' },
  { key: 'payment', label: 'Payment' },
  { key: 'verify', label: 'Face Verification' },
  { key: 'done', label: 'Submitted' },
];

/**
 * Shared stepper header for both application journeys (manual and
 * Continue-with-OTR). Purely presentational — each page decides when to
 * advance. Kept identical across both journeys so a candidate always
 * knows where they are, regardless of how their details were collected.
 */
export function ApplicationWizard({ current }: { current: WizardStepKey }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <div style={{ display: 'flex', marginBottom: '1.75rem', flexWrap: 'wrap', rowGap: '0.5rem' }}>
      {STEPS.map((step, i) => {
        const state = i < currentIndex ? 'done' : i === currentIndex ? 'active' : 'upcoming';
        return (
          <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  flexShrink: 0,
                  background: state === 'upcoming' ? 'var(--neutral-tint)' : 'var(--navy)',
                  color: state === 'upcoming' ? 'var(--neutral)' : '#fff',
                }}
              >
                {state === 'done' ? '✓' : i + 1}
              </span>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: state === 'active' ? 700 : 600,
                  color: state === 'upcoming' ? 'var(--neutral)' : 'var(--ink)',
                  whiteSpace: 'nowrap',
                }}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 1, background: 'var(--border)', margin: '0 0.75rem', minWidth: 16 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
