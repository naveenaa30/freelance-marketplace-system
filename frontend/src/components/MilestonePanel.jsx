import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function MilestonePanel({ projectId, projectStatus, isOwner, isAssignedFreelancer, onChanged }) {
  const { user } = useAuth();
  const [data, setData] = useState({ milestones: [], progress: 0 });
  const [form, setForm] = useState({ title: '', description: '', due_date: '' });
  const [tick, setTick] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/projects/${projectId}/milestones`)
      .then((res) => setData(res.data))
      .catch(() => {});
  }, [projectId, tick, projectStatus]);

  const refresh = () => {
    setTick((t) => t + 1);
    onChanged();
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const add = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/projects/${projectId}/milestones`, form);
      setForm({ title: '', description: '', due_date: '' });
      refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add milestone');
    }
  };

  const setStatus = async (id, status) => {
    setError('');
    try {
      await api.put(`/milestones/${id}`, { status });
      refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update milestone');
    }
  };

  const complete = async () => {
    if (!window.confirm('Mark this project as completed?')) return;
    setError('');
    try {
      await api.post(`/projects/${projectId}/complete`);
      refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not complete project');
    }
  };

  const active = ['assigned', 'in_progress'].includes(projectStatus);
  const allDone = data.milestones.length > 0 && data.milestones.every((m) => m.status === 'done');

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Milestones and progress</h2>

      <div style={{ background: '#e2e8f0', borderRadius: 8, height: 14, marginBottom: 6 }}>
        <div style={{ width: `${data.progress}%`, background: '#22c55e', height: '100%', borderRadius: 8 }} />
      </div>
      <p className="muted">{data.progress}% complete</p>

      {error && <div className="error">{error}</div>}
      {data.milestones.length === 0 && <p className="muted">No milestones yet.</p>}

      {data.milestones.map((m) => (
        <div className="row" key={m.id} style={{ padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>
          <div>
            <b>{m.title}</b>
            {m.due_date && <span className="muted"> · due {String(m.due_date).slice(0, 10)}</span>}
            {m.description && <div className="muted">{m.description}</div>}
          </div>
          <div>
            <span className={`status ${m.status === 'done' ? 'completed' : m.status}`}>{m.status.replace('_', ' ')}</span>{' '}
            {isAssignedFreelancer && projectStatus !== 'completed' && (
              <>
                {m.status !== 'in_progress' && m.status !== 'done' && (
                  <button className="btn small gray" onClick={() => setStatus(m.id, 'in_progress')}>Start</button>
                )}{' '}
                {m.status !== 'done' && (
                  <button className="btn small" onClick={() => setStatus(m.id, 'done')}>Mark done</button>
                )}
              </>
            )}
          </div>
        </div>
      ))}

      {isOwner && active && (
        <form onSubmit={add} style={{ marginTop: 16 }}>
          <h3>Add milestone</h3>
          <input name="title" placeholder="Title" value={form.title} onChange={handleChange} required />
          <input name="description" placeholder="Description (optional)" value={form.description} onChange={handleChange} />
          <input name="due_date" type="date" value={form.due_date} onChange={handleChange} />
          <button className="btn" type="submit">Add milestone</button>
        </form>
      )}

      {isOwner && active && allDone && (
        <p><button className="btn" onClick={complete}>Mark project as completed</button></p>
      )}
      {!user && null}
    </div>
  );
}