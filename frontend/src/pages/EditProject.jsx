import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import SkillPicker from '../components/SkillPicker';

export default function EditProject() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', budget: '', deadline: '' });
  const [allSkills, setAllSkills] = useState([]);
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [p, s] = await Promise.all([api.get(`/projects/${id}`), api.get('/skills')]);
        const pr = p.data.project;
        if (pr.status !== 'open') setLocked(true);
        setForm({
          title: pr.title,
          description: pr.description || '',
          budget: pr.budget,
          deadline: pr.deadline ? String(pr.deadline).slice(0, 10) : ''
        });
        setSelected(p.data.skills.map((x) => x.id));
        setAllSkills(s.data.skills);
      } catch {
        setError('Could not load project');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.put(`/projects/${id}`, { ...form, skillIds: selected });
      navigate('/my-projects');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="container"><p className="muted">Loading...</p></div>;

  return (
    <div className="container">
      <h1>Edit Project</h1>
      <div className="card">
        {locked && <div className="error">This project is no longer open, so it cannot be edited.</div>}
        {error && <div className="error">{error}</div>}
        <form onSubmit={submit}>
          <label>Title</label>
          <input name="title" value={form.title} onChange={handleChange} required disabled={locked} />
          <label>Description</label>
          <textarea name="description" rows="5" value={form.description} onChange={handleChange} disabled={locked} />
          <label>Budget</label>
          <input name="budget" type="number" min="1" value={form.budget} onChange={handleChange} required disabled={locked} />
          <label>Deadline</label>
          <input name="deadline" type="date" value={form.deadline} onChange={handleChange} disabled={locked} />
          <label>Required skills</label>
          <SkillPicker skills={allSkills} selected={selected} onChange={setSelected} />
          <button className="btn" type="submit" disabled={saving || locked}>{saving ? 'Saving...' : 'Save changes'}</button>{' '}
          <button className="btn gray" type="button" onClick={() => navigate('/my-projects')}>Cancel</button>
        </form>
      </div>
    </div>
  );
}