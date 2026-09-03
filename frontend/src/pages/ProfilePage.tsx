import { FormEvent, useEffect, useState } from 'react';
import { fetchMyProfile, updateMyProfile } from '../api/profile';
import { ApiError } from '../api/client';
import { CanonicalProfile, CanonicalEducationRecord } from '../types';
import { LoadingBlock, ErrorBanner } from '../components/Feedback';
import { DataCategoryTag } from '../components/StatusBadge';

type IdentityForm = {
  fullName: string;
  dateOfBirth: string;
  gender: string;
  guardianName: string;
  mobile: string;
};

type AddressForm = { addressLine: string; city: string; state: string; pincode: string };

const EMPTY_EDUCATION: CanonicalEducationRecord = { level: 'secondary', board: '', institution: '', yearOfPassing: undefined, percentage: undefined };

export default function ProfilePage() {
  const [profile, setProfile] = useState<CanonicalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [identity, setIdentity] = useState<IdentityForm>({ fullName: '', dateOfBirth: '', gender: '', guardianName: '', mobile: '' });
  const [address, setAddress] = useState<AddressForm>({ addressLine: '', city: '', state: '', pincode: '' });
  const [education, setEducation] = useState<CanonicalEducationRecord[]>([]);

  const [savingSection, setSavingSection] = useState<'identity' | 'address' | 'education' | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  function hydrateForms(p: CanonicalProfile) {
    setIdentity({
      fullName: p.identity.fullName,
      dateOfBirth: p.identity.dateOfBirth ? p.identity.dateOfBirth.slice(0, 10) : '',
      gender: p.identity.gender ?? '',
      guardianName: p.identity.guardianName ?? '',
      mobile: p.contact.mobile,
    });
    setAddress({
      addressLine: p.address?.addressLine ?? '',
      city: p.address?.city ?? '',
      state: p.address?.state ?? '',
      pincode: p.address?.pincode ?? '',
    });
    setEducation(p.education.length > 0 ? p.education : []);
  }

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const p = await fetchMyProfile();
      setProfile(p);
      hydrateForms(p);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Could not load your profile.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function flashSaved(section: string) {
    setSavedNotice(section);
    window.setTimeout(() => setSavedNotice(null), 2500);
  }

  async function saveIdentity(e: FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSavingSection('identity');
    try {
      const updated = await updateMyProfile({
        fullName: identity.fullName,
        dateOfBirth: new Date(identity.dateOfBirth).toISOString(),
        gender: identity.gender || undefined,
        guardianName: identity.guardianName || undefined,
        mobile: identity.mobile,
      });
      setProfile(updated);
      flashSaved('Identity & contact details saved.');
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Could not save. Please try again.');
    } finally {
      setSavingSection(null);
    }
  }

  async function saveAddress(e: FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSavingSection('address');
    try {
      const updated = await updateMyProfile({ address });
      setProfile(updated);
      flashSaved('Address saved.');
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Could not save. Please try again.');
    } finally {
      setSavingSection(null);
    }
  }

  async function saveEducation(e: FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSavingSection('education');
    try {
      const updated = await updateMyProfile({ education });
      setProfile(updated);
      hydrateForms(updated);
      flashSaved('Education details saved.');
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Could not save. Please try again.');
    } finally {
      setSavingSection(null);
    }
  }

  function updateEducationRow(index: number, patch: Partial<CanonicalEducationRecord>) {
    setEducation((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addEducationRow() {
    setEducation((rows) => [...rows, { ...EMPTY_EDUCATION }]);
  }

  function removeEducationRow(index: number) {
    setEducation((rows) => rows.filter((_, i) => i !== index));
  }

  if (loading) return <LoadingBlock label="Loading your OTR profile…" />;
  if (loadError) return <ErrorBanner message={loadError} onRetry={load} />;
  if (!profile) return null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1>Your OTR Profile</h1>
          <p>
            OTR ID: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>{profile.otrId}</span>
          </p>
        </div>
        <DataCategoryTag kind="reusable" />
      </div>

      {saveError && <ErrorBanner message={saveError} />}
      {savedNotice && <div className="banner banner-info">{savedNotice}</div>}

      <section className="card" style={{ marginTop: '1.25rem' }}>
        <h2>Identity &amp; contact</h2>
        <p style={{ fontSize: '0.85rem' }}>Reusable across every application you apply to via OTR.</p>
        <form onSubmit={saveIdentity}>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="fullName">Full name</label>
              <input id="fullName" value={identity.fullName} onChange={(e) => setIdentity((s) => ({ ...s, fullName: e.target.value }))} required />
            </div>
            <div className="field">
              <label htmlFor="dob">Date of birth</label>
              <input id="dob" type="date" value={identity.dateOfBirth} onChange={(e) => setIdentity((s) => ({ ...s, dateOfBirth: e.target.value }))} required />
            </div>
            <div className="field">
              <label htmlFor="gender">Gender</label>
              <select id="gender" value={identity.gender} onChange={(e) => setIdentity((s) => ({ ...s, gender: e.target.value }))}>
                <option value="">Prefer not to say</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="guardian">Parent / guardian name</label>
              <input id="guardian" value={identity.guardianName} onChange={(e) => setIdentity((s) => ({ ...s, guardianName: e.target.value }))} />
            </div>
            <div className="field">
              <label htmlFor="mobile">Mobile number</label>
              <input id="mobile" value={identity.mobile} onChange={(e) => setIdentity((s) => ({ ...s, mobile: e.target.value }))} required minLength={6} />
            </div>
            <div className="field">
              <label htmlFor="email">Email (login)</label>
              <input id="email" value={profile.contact.email} disabled />
              <span className="field-hint">Contact support to change your login email.</span>
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={savingSection === 'identity'}>
            {savingSection === 'identity' ? 'Saving…' : 'Save identity & contact'}
          </button>
        </form>
      </section>

      <section className="card" style={{ marginTop: '1.25rem' }}>
        <h2>Address</h2>
        <p style={{ fontSize: '0.85rem' }}>Reusable across every application you apply to via OTR.</p>
        <form onSubmit={saveAddress}>
          <div className="grid-2">
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="addressLine">Address line</label>
              <input id="addressLine" value={address.addressLine} onChange={(e) => setAddress((s) => ({ ...s, addressLine: e.target.value }))} required />
            </div>
            <div className="field">
              <label htmlFor="city">City</label>
              <input id="city" value={address.city} onChange={(e) => setAddress((s) => ({ ...s, city: e.target.value }))} required />
            </div>
            <div className="field">
              <label htmlFor="state">State</label>
              <input id="state" value={address.state} onChange={(e) => setAddress((s) => ({ ...s, state: e.target.value }))} required />
            </div>
            <div className="field">
              <label htmlFor="pincode">Pincode</label>
              <input id="pincode" value={address.pincode} onChange={(e) => setAddress((s) => ({ ...s, pincode: e.target.value }))} required minLength={4} />
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={savingSection === 'address'}>
            {savingSection === 'address' ? 'Saving…' : 'Save address'}
          </button>
        </form>
      </section>

      <section className="card" style={{ marginTop: '1.25rem' }}>
        <h2>Education</h2>
        <p style={{ fontSize: '0.85rem' }}>Reusable qualifications — shown to applications only when you consent.</p>
        <form onSubmit={saveEducation}>
          {education.map((row, i) => (
            <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.9rem', marginBottom: '0.8rem' }}>
              <div className="grid-2">
                <div className="field">
                  <label>Level</label>
                  <select value={row.level} onChange={(e) => updateEducationRow(i, { level: e.target.value })}>
                    <option value="secondary">10th / Secondary</option>
                    <option value="seniorSecondary">12th / Senior Secondary</option>
                    <option value="graduation">Graduation</option>
                  </select>
                </div>
                <div className="field">
                  <label>Board / University</label>
                  <input value={row.board ?? ''} onChange={(e) => updateEducationRow(i, { board: e.target.value })} />
                </div>
                <div className="field">
                  <label>Institution</label>
                  <input value={row.institution ?? ''} onChange={(e) => updateEducationRow(i, { institution: e.target.value })} />
                </div>
                <div className="field">
                  <label>Year of passing</label>
                  <input
                    type="number"
                    value={row.yearOfPassing ?? ''}
                    onChange={(e) => updateEducationRow(i, { yearOfPassing: e.target.value ? Number(e.target.value) : undefined })}
                  />
                </div>
                <div className="field">
                  <label>Percentage</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    max={100}
                    value={row.percentage ?? ''}
                    onChange={(e) => updateEducationRow(i, { percentage: e.target.value ? Number(e.target.value) : undefined })}
                  />
                </div>
              </div>
              <button type="button" className="btn btn-danger" style={{ padding: '0.3em 0.8em' }} onClick={() => removeEducationRow(i)}>
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-secondary" onClick={addEducationRow} style={{ marginBottom: '1rem' }}>
            + Add education entry
          </button>
          <div>
            <button className="btn btn-primary" type="submit" disabled={savingSection === 'education'}>
              {savingSection === 'education' ? 'Saving…' : 'Save education'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
