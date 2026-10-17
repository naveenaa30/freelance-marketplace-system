import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import SkillPicker from '../components/SkillPicker';

export default function PostProject() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', budget: '', deadline: '' });
  const [allSkills, setAllSkills] = useState([]);
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/skills').then((res) => setAllSkills(res.data.skills)).catch(() => {});
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/projects', { ...form, skillIds: selected });
      navigate('/my-projects');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create project');
    }
  };

  return (
    <div className="container">
      <h1>Post a Project</h1>
      <div className="card">
        {error && <div className="error">{error}</div>}
        <form onSubmit={submit}>
          <label>Title</label>
          <input name="title" value={form.title} onChange={handleChange} required />
          <label>Description</label>
          <textarea name="description" rows="5" value={form.description} onChange={handleChange} />
          <label>Budget</label>
          <input name="budget" type="number" min="1" value={form.budget} onChange={handleChange} required />
          <label>Deadline</label>
          <input name="deadline" type="date" value={form.deadline} onChange={handleChange} />
          <label>Required skills</label>
          <SkillPicker skills={allSkills} selected={selected} onChange={setSelected} />
          <button className="btn" type="submit">Post project</button>
        </form>
      </div>
    </div>
  );
}