import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitApplicationViaToken, OtrApiError } from '../api/otr';
import { clearDraft, clearPendingAuthorization, getDraft, saveApplication } from '../api/sscStore';
import { ApplicationWizard } from '../components/ApplicationWizard';
import { FaceVerificationMock } from '../components/FaceVerificationMock';
import { ErrorBanner, LoadingBlock } from '../components/Feedback';

export default function OtrVerifyPage() {
  const navigate = useNavigate();
  const draft = getDraft();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!draft || draft.method !== 'OTR') {
    return (
      <div style={{ maxWidth: 640 }}>
        <ErrorBanner message="No application in progress. Please start again from Apply Now." />
      </div>
    );
  }

  async function handleVerified() {
    if (!draft || draft.method !== 'OTR') return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await submitApplicationViaToken({
        token: draft.token,
        applicationName: 'Junior Engineer Recruitment 2026',
        appSpecificData: { examCentre: draft.examCentre, postPreference: draft.postPreference },
      });

      saveApplication({
        applicationRefId: result.applicationRefId,
        method: 'OTR',
        otrAccessToken: draft.token,
        examCentre: draft.examCentre,
        postPreference: draft.postPreference,
        candidateName: draft.candidateName,
        submittedAt: result.submittedAt,
        status: result.status,
      });
      clearDraft();
      clearPendingAuthorization();
      navigate(`/applications/${result.applicationRefId}`, { replace: true });
    } catch (err) {
      setError(err instanceof OtrApiError ? err.message : 'Could not submit your application.');
      setSubmitting(false);
    }
  }

  if (submitting) return <LoadingBlock label="Submitting your application…" />;

  return (
    <div style={{ maxWidth: 560 }}>
      <ApplicationWizard current="verify" />
      <h1>Identity Verification</h1>
      {error && <ErrorBanner message={error} />}
      <FaceVerificationMock onComplete={handleVerified} />
    </div>
  );
}
