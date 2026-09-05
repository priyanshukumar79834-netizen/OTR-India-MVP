import { Route, Routes } from 'react-router-dom';
import GovLayout from './components/GovChrome';
import HomePage from './pages/HomePage';
import ApplyStartPage from './pages/ApplyStartPage';
import ManualFormPage from './pages/ManualFormPage';
import ManualReviewPage from './pages/ManualReviewPage';
import ManualPaymentPage from './pages/ManualPaymentPage';
import ManualVerifyPage from './pages/ManualVerifyPage';
import OtrIntroPage from './pages/OtrIntroPage';
import CallbackPage from './pages/CallbackPage';
import OtrApplicationFormPage from './pages/OtrApplicationFormPage';
import OtrReviewPage from './pages/OtrReviewPage';
import OtrPaymentPage from './pages/OtrPaymentPage';
import OtrVerifyPage from './pages/OtrVerifyPage';
import ApplicationDetailPage from './pages/ApplicationDetailPage';
import MyApplicationsPage from './pages/MyApplicationsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<GovLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/apply" element={<ApplyStartPage />} />

        {/* Manual Form Fill journey — never touches OTR */}
        <Route path="/apply/manual" element={<ManualFormPage />} />
        <Route path="/apply/manual/review" element={<ManualReviewPage />} />
        <Route path="/apply/manual/payment" element={<ManualPaymentPage />} />
        <Route path="/apply/manual/verify" element={<ManualVerifyPage />} />

        {/* Continue with OTR journey */}
        <Route path="/apply/otr" element={<OtrIntroPage />} />
        {/* Reached only by the redirect back from OTR-India's /authorize screen */}
        <Route path="/callback" element={<CallbackPage />} />
        <Route path="/apply/otr/form" element={<OtrApplicationFormPage />} />
        <Route path="/apply/otr/review" element={<OtrReviewPage />} />
        <Route path="/apply/otr/payment" element={<OtrPaymentPage />} />
        <Route path="/apply/otr/verify" element={<OtrVerifyPage />} />

        <Route path="/applications" element={<MyApplicationsPage />} />
        <Route path="/applications/:refId" element={<ApplicationDetailPage />} />
      </Route>
    </Routes>
  );
}

