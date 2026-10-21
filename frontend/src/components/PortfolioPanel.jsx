import { useEffect, useState } from 'react';
import api from '../api/axios';

const FILES = 'http://localhost:5000';
const isImage = (p) => /\.(png|jpe?g)$/i.test(p);

export default function PortfolioPanel() {
  const [data, setData] = useState({ resume: null, items: [] });
  const [form, setForm] = useState({ title: '', description: '' });
  const [file, setFile] = useState(null);
  const [fileKey, setFileKey] = useState(0);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = () =>
    api.get('/portfolio/my').then((r) => setData(r.data)).catch(() => {});

  useEffect(() => {
    load();
  }, []);

  const flash = (m, isError = false) => {
    setMsg(isError ? '' : m);
    setError(isError ? m : '');
  };

  const uploadResume = async (e) => {
    const chosen = e.target.files[0];
    if (!chosen) return;
    const body = new FormData();
    body.append('resume', chosen);
    try {
      await api.post('/portfolio/resume', body);
      flash('Resume uploaded');
      load();
    } catch (err) {
      flash(err.response?.data?.message || 'Upload failed', true);
    }
    e.target.value = '';
  };

  const addItem = async (e) => {
    e.preventDefault();
    if (!file) return flash('Please choose a file', true);
    const body = new FormData();
    body.append('title', form.title);
    body.append('description', form.description);
    body.append('file', file);
    try {
      await api.post('/portfolio', body);
      flash('Portfolio item added');
      setForm({ title: '', description: '' });
      setFile(null);
      setFileKey((k) => k + 1);
      load();
    } catch (err) {
      flash(err.response?.data?.message || 'Upload failed', true);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      await api.delete(`/portfolio/${id}`);
      load();
    } catch (err) {
      flash(err.response?.data?.message || 'Delete failed', true);
    }
  };

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Resume and Portfolio</h2>
      {msg && <div className="success">{msg}</div>}
      {error && <div className="error">{error}</div>}

      <h3>Resume (PDF, max 5 MB)</h3>
      {data.resume ? (
        <p><a href={`${FILES}${data.resume}`} target="_blank" rel="noreferrer">View current resume</a></p>
      ) : (
        <p className="muted">No resume uploaded yet.</p>
      )}
      <input type="file" accept=".pdf" onChange={uploadResume} />

      <h3>Add portfolio item (PDF, PNG or JPG, max 5 MB)</h3>
      <form onSubmit={addItem}>
        <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <input placeholder="Short description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <input key={fileKey} type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files[0])} />
        <button className="btn" type="submit">Upload item</button>
      </form>

      <h3>My portfolio ({data.items.length})</h3>
      {data.items.length === 0 && <p className="muted">Nothing here yet.</p>}
      <div className="grid">
        {data.items.map((it) => (
          <div className="card" key={it.id}>
            {isImage(it.file_path) && (
              <img src={`${FILES}${it.file_path}`} alt={it.title} style={{ width: '100%', borderRadius: 10, marginBottom: 8 }} />
            )}
            <h3>{it.title}</h3>
            {it.description && <p className="muted">{it.description}</p>}
            <a href={`${FILES}${it.file_path}`} target="_blank" rel="noreferrer">Open file</a>{' '}
            <button className="btn small danger" onClick={() => remove(it.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}