import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveDraft } from '../api/sscStore';
import { EXAM_CENTRES } from '../config/fieldLabels';
import { ApplicationWizard } from '../components/ApplicationWizard';

/**
 * Manual application path (project brief Batch 5): the candidate types
 * everything themselves, directly into GovRecruit-A. Nothing here talks
 * to OTR at all — this is a genuinely independent way to apply, not a
 * degraded version of the OTR path.
 */
export default function ManualFormPage() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('Male');
  const [guardianName, setGuardianName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [qualification10th, setQualification10th] = useState('');
  const [qualification12th, setQualification12th] = useState('');
  const [examCentre, setExamCentre] = useState(EXAM_CENTRES[0]);
  const [postPreference, setPostPreference] = useState('Junior Engineer (Civil)');
  const [declaration, setDeclaration] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    saveDraft({
      method: 'MANUAL',
      fullName,
      dateOfBirth,
      gender,
      guardianName,
      mobile,
      email,
      addressLine,
      city,
      state,
      pincode,
      qualification10th,
      qualification12th,
      examCentre,
      postPreference,
    });
    navigate('/apply/manual/review');
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <ApplicationWizard current="details" />
      <h1>Application Form</h1>
      <p style={{ fontSize: '0.85rem' }}>Fill in your details below. All fields are required unless marked optional.</p>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Personal Information</h2>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="fullName">Full Name</label>
              <input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="dob">Date of Birth</label>
              <input id="dob" type="date" required value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="gender">Gender</label>
              <select id="gender" value={gender} onChange={(e) => setGender(e.target.value)}>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="guardianName">Guardian's Name</label>
              <input id="guardianName" required value={guardianName} onChange={(e) => setGuardianName(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: '1.25rem' }}>
          <h2 style={{ marginTop: 0 }}>Contact Information</h2>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="mobile">Mobile Number</label>
              <input
                id="mobile"
                required
                pattern="[0-9]{10}"
                title="10-digit mobile number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="email">Email Address</label>
              <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: '1.25rem' }}>
          <h2 style={{ marginTop: 0 }}>Address</h2>
          <div className="field">
            <label htmlFor="addressLine">Address</label>
            <input id="addressLine" required value={addressLine} onChange={(e) => setAddressLine(e.target.value)} />
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="city">City</label>
              <input id="city" required value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="state">State</label>
              <input id="state" required value={state} onChange={(e) => setState(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="pincode">PIN Code</label>
              <input
                id="pincode"
                required
                pattern="[0-9]{6}"
                title="6-digit PIN code"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: '1.25rem' }}>
          <h2 style={{ marginTop: 0 }}>Education / Qualification</h2>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="q10">10th Qualification (Board, Year)</label>
              <input
                id="q10"
                required
                placeholder="e.g. CBSE, 2016"
                value={qualification10th}
                onChange={(e) => setQualification10th(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="q12">12th Qualification (Board, Year)</label>
              <input
                id="q12"
                required
                placeholder="e.g. CBSE, 2018"
                value={qualification12th}
                onChange={(e) => setQualification12th(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: '1.25rem' }}>
          <h2 style={{ marginTop: 0 }}>Examination Preferences</h2>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="examCentre">Preferred Exam Centre</label>
              <select id="examCentre" value={examCentre} onChange={(e) => setExamCentre(e.target.value)}>
                {EXAM_CENTRES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="postPreference">Post Preference</label>
              <select id="postPreference" value={postPreference} onChange={(e) => setPostPreference(e.target.value)}>
                <option>Junior Engineer (Civil)</option>
                <option>Junior Engineer (Mechanical)</option>
                <option>Junior Engineer (Electrical)</option>
              </select>
            </div>
          </div>
          <label style={{ display: 'flex', gap: '0.5rem', fontSize: '0.85rem', alignItems: 'flex-start', marginTop: '0.5rem' }}>
            <input type="checkbox" checked={declaration} onChange={(e) => setDeclaration(e.target.checked)} style={{ marginTop: '0.2rem' }} />
            <span>I declare that the information provided is true to the best of my knowledge.</span>
          </label>
        </div>

        <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '1.25rem' }} disabled={!declaration}>
          Continue to Review
        </button>
      </form>
    </div>
  );
}
