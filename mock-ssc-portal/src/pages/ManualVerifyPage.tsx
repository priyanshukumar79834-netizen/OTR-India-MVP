import { useNavigate } from 'react-router-dom';
import { clearDraft, generateManualApplicationRef, getDraft, saveApplication } from '../api/sscStore';
import { ApplicationWizard } from '../components/ApplicationWizard';
import { FaceVerificationMock } from '../components/FaceVerificationMock';
import { ErrorBanner } from '../components/Feedback';

export default function ManualVerifyPage() {
  const navigate = useNavigate();
  const draft = getDraft();

  if (!draft || draft.method !== 'MANUAL') {
    return (
      <div style={{ maxWidth: 640 }}>
        <ErrorBanner message="No application in progress. Please start again from Apply Now." />
      </div>
    );
  }

  function handleVerified() {
    if (!draft || draft.method !== 'MANUAL') return;
    const applicationRefId = generateManualApplicationRef();
    saveApplication({
      applicationRefId,
      method: 'MANUAL',
      examCentre: draft.examCentre,
      postPreference: draft.postPreference,
      candidateName: draft.fullName,
      submittedAt: new Date().toISOString(),
      status: 'SUBMITTED',
    });
    clearDraft();
    navigate(`/applications/${applicationRefId}`, { replace: true });
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <ApplicationWizard current="verify" />
      <h1>Identity Verification</h1>
      <FaceVerificationMock onComplete={handleVerified} />
    </div>
  );
}
