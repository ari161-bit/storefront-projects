import { useState } from 'react';
import api, { apiErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  async function saveProfile() {
    setProfileError('');
    setSavingProfile(true);
    try {
      const res = await api.put('/auth/profile', { name, email });
      localStorage.setItem('lumera_token', res.data.token);
      await refreshUser();
      showToast('Profile updated');
    } catch (e) {
      setProfileError(apiErrorMessage(e, 'Could not update your profile.'));
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword() {
    setPwError('');
    setPwSuccess('');
    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }
    setSavingPw(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      setPwSuccess('Password updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      setPwError(apiErrorMessage(e, 'Could not update your password.'));
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div className="space-y-10 max-w-lg">
      <section>
        <h2 className="font-serif-display text-xl text-espressoDark mb-5">Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="text-[11px] uppercase tracking-wide text-espresso/50">Full Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border-b border-espresso/20 bg-transparent px-1 py-2.5 text-sm focus:outline-none focus:border-champagneDark" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wide text-espresso/50">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="w-full border-b border-espresso/20 bg-transparent px-1 py-2.5 text-sm focus:outline-none focus:border-champagneDark" />
          </div>
          {profileError && <p className="text-xs text-red-600">{profileError}</p>}
          <button onClick={saveProfile} disabled={savingProfile} className="px-6 py-3 rounded-full bg-espressoDark text-ivory text-sm uppercase tracking-wide hover:bg-espresso transition-colors disabled:opacity-50">
            Save Changes
          </button>
        </div>
      </section>

      <section>
        <h2 className="font-serif-display text-xl text-espressoDark mb-5">Change Password</h2>
        <div className="space-y-4">
          <input value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} type="password" placeholder="Current password" className="w-full border-b border-espresso/20 bg-transparent px-1 py-2.5 text-sm focus:outline-none focus:border-champagneDark" />
          <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" placeholder="New password" className="w-full border-b border-espresso/20 bg-transparent px-1 py-2.5 text-sm focus:outline-none focus:border-champagneDark" />
          <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" placeholder="Confirm new password" className="w-full border-b border-espresso/20 bg-transparent px-1 py-2.5 text-sm focus:outline-none focus:border-champagneDark" />
          {pwError && <p className="text-xs text-red-600">{pwError}</p>}
          {pwSuccess && <p className="text-xs text-green-700">{pwSuccess}</p>}
          <button onClick={changePassword} disabled={savingPw} className="px-6 py-3 rounded-full border border-espresso/25 text-espressoDark text-sm uppercase tracking-wide hover:border-champagneDark transition-colors disabled:opacity-50">
            Update Password
          </button>
        </div>
      </section>
    </div>
  );
}
