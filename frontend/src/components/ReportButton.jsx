import { useState } from 'react';
import api from '../api/axios';

export default function ReportButton({ projectId, reportedUserId }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/reports', { projectId, reportedUserId, reason });
      setMsg('Report sent to the admin.');
      setReason('');
      setOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send report');
    }
  };

  return (
    <div style={{ marginTop: 24 }}>
      {msg && <div className="success">{msg}</div>}
      {!open ? (
        <button className="btn small gray" onClick={() => setOpen(true)}>Report a problem</button>
      ) : (
        <form className="card" onSubmit={submit}>
          <h3>Report a problem</h3>
          {error && <div className="error">{error}</div>}
          <textarea rows="3" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe the issue" required />
          <button className="btn small" type="submit">Send report</button>{' '}
          <button className="btn small gray" type="button" onClick={() => setOpen(false)}>Cancel</button>
        </form>
      )}
    </div>
  );
}