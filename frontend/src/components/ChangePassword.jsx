import { useState } from 'react';
import api from '../api/axios';

export default function ChangePassword() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');
    if (form.newPassword !== form.confirm) {
      return setError('New password and confirmation do not match');
    }
    setSaving(true);
    try {
      await api.put('/auth/password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword
      });
      setMsg('Password changed successfully');
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Change password</h2>
      {msg && <div className="success">{msg}</div>}
      {error && <div className="error">{error}</div>}
      <form onSubmit={submit}>
        <label>Current password</label>
        <input name="currentPassword" type="password" value={form.currentPassword} onChange={handleChange} required />
        <label>New password (min 6 characters)</label>
        <input name="newPassword" type="password" value={form.newPassword} onChange={handleChange} required />
        <label>Confirm new password</label>
        <input name="confirm" type="password" value={form.confirm} onChange={handleChange} required />
        <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Change password'}</button>
      </form>
    </div>
  );
}