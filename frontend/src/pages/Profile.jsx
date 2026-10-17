import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import SkillPicker from '../components/SkillPicker';

export default function Profile() {
  const { user } = useAuth();
  const isFreelancer = user.role === 'freelancer';
  const [form, setForm] = useState({});
  const [allSkills, setAllSkills] = useState([]);
  const [selected, setSelected] = useState([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [p, s] = await Promise.all([api.get('/profile'), api.get('/skills')]);
        setForm(p.data.profile || {});
        setSelected(p.data.skills.map((x) => x.id));
        setAllSkills(s.data.skills);
      } catch {
        setError('Could not load profile');
      }
    };
    load();
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');
    try {
      await api.put('/profile', form);
      if (isFreelancer) await api.put('/profile/skills', { skillIds: selected });
      setMsg('Profile saved');
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    }
  };

  return (
    <div className="container">
      <h1>My Profile</h1>
      <div className="card">
        <p className="muted">{user.name} · {user.email}</p>
        {msg && <div className="success">{msg}</div>}
        {error && <div className="error">{error}</div>}
        <form onSubmit={save}>
          {isFreelancer ? (
            <>
              <label>Professional title</label>
              <input name="title" value={form.title ?? ''} onChange={handleChange} placeholder="Full Stack Developer" />
              <label>Bio</label>
              <textarea name="bio" rows="4" value={form.bio ?? ''} onChange={handleChange} />
              <label>Years of experience</label>
              <input name="experience_years" type="number" min="0" value={form.experience_years ?? 0} onChange={handleChange} />
              <label>Hourly rate</label>
              <input name="hourly_rate" type="number" min="0" value={form.hourly_rate ?? ''} onChange={handleChange} />
              <label>My skills</label>
              <SkillPicker skills={allSkills} selected={selected} onChange={setSelected} />
              <p className="muted">
                Rating: {form.avg_rating ?? 0} / 5 · Completed projects: {form.completed_projects ?? 0}
              </p>
            </>
          ) : (
            <>
              <label>Company name</label>
              <input name="company_name" value={form.company_name ?? ''} onChange={handleChange} />
              <label>About</label>
              <textarea name="about" rows="4" value={form.about ?? ''} onChange={handleChange} />
            </>
          )}
          <button className="btn" type="submit">Save profile</button>
        </form>
      </div>
    </div>
  );
}