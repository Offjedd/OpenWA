import { useState, type FormEvent } from 'react';
import { User, Lock, Loader as Loader2, CircleCheck as CheckCircle } from 'lucide-react';
import { customerAuthApi } from '../../services/customerApi';
import { useCustomerAuth } from '../../hooks/useCustomerAuth';
import './CustomerSettings.css';

export function CustomerSettings() {
  const { customer, updateCustomer } = useCustomerAuth();
  const [fullName, setFullName] = useState(customer?.fullName || '');
  const [email, setEmail] = useState(customer?.email || '');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleProfile = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const updated = await customerAuthApi.updateProfile({ fullName, email });
      updateCustomer(updated);
      setSuccess('Profile updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (newPw !== confirmPw) { setError('Passwords do not match'); return; }
    if (newPw.length < 8) { setError('Password must be at least 8 characters'); return; }

    setSaving(true);
    try {
      await customerAuthApi.updateProfile({ password: newPw });
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setSuccess('Password changed successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="csettings">
      <div className="csettings__header">
        <h1>Account Settings</h1>
        <p>Manage your profile and security</p>
      </div>

      {error && (
        <div className="csettings__banner csettings__banner--error">{error}</div>
      )}
      {success && (
        <div className="csettings__banner csettings__banner--success">
          <CheckCircle size={16} /> {success}
        </div>
      )}

      {/* Profile */}
      <div className="csettings__card">
        <div className="csettings__card-header">
          <User size={20} />
          <h3>Profile Information</h3>
        </div>
        <form onSubmit={handleProfile} className="csettings__form">
          <div className="csettings__field">
            <label>Full name</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required />
          </div>
          <div className="csettings__field">
            <label>Email address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="csettings__plan">
            <span>Plan:</span>
            <span className={`csettings__plan-badge ${customer?.plan === 'premium' ? 'csettings__plan-badge--premium' : ''}`}>
              {customer?.plan === 'premium' ? 'Premium' : 'Free'}
            </span>
          </div>
          <button type="submit" className="csettings__submit" disabled={saving}>
            {saving ? <Loader2 size={16} className="spin" /> : null}
            Save Profile
          </button>
        </form>
      </div>

      {/* Password */}
      <div className="csettings__card">
        <div className="csettings__card-header">
          <Lock size={20} />
          <h3>Change Password</h3>
        </div>
        <form onSubmit={handlePassword} className="csettings__form">
          <div className="csettings__field">
            <label>Current password</label>
            <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="Enter current password" />
          </div>
          <div className="csettings__field">
            <label>New password</label>
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min. 8 characters" required />
          </div>
          <div className="csettings__field">
            <label>Confirm new password</label>
            <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Repeat new password" required />
          </div>
          <button type="submit" className="csettings__submit" disabled={saving || !newPw}>
            {saving ? <Loader2 size={16} className="spin" /> : null}
            Change Password
          </button>
        </form>
      </div>
    </div>
  );
}
