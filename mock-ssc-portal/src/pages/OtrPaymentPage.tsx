import { useNavigate } from 'react-router-dom';
import { getDraft } from '../api/sscStore';
import { ApplicationWizard } from '../components/ApplicationWizard';
import { PaymentMock } from '../components/PaymentMock';
import { ErrorBanner } from '../components/Feedback';

export default function OtrPaymentPage() {
  const navigate = useNavigate();
  const draft = getDraft();

  if (!draft || draft.method !== 'OTR') {
    return (
      <div style={{ maxWidth: 640 }}>
        <ErrorBanner message="No application in progress. Please start again from Apply Now." />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <ApplicationWizard current="payment" />
      <h1>Examination Fee Payment</h1>
      <PaymentMock amount={500} onComplete={() => navigate('/apply/otr/verify')} />
    </div>
  );
}
