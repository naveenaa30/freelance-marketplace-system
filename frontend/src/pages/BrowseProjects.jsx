import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function BrowseProjects() {
  const [skills, setSkills] = useState([]);
  const [filters, setFilters] = useState({ search: '', skill: '', minBudget: '' });
  const [projects, setProjects] = useState([]);
  const [recommended, setRecommended] = useState([]);

  const load = async (f = filters) => {
    const params = {};
    if (f.search) params.search = f.search;
    if (f.skill) params.skill = f.skill;
    if (f.minBudget) params.minBudget = f.minBudget;
    try {
      const res = await api.get('/projects', { params });
      setProjects(res.data.projects);
    } catch {
      setProjects([]);
    }
  };

  useEffect(() => {
    api.get('/skills').then((r) => setSkills(r.data.skills)).catch(() => {});
    api.get('/recommendations/projects').then((r) => setRecommended(r.data.projects)).catch(() => {});
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

  const reset = () => {
    const empty = { search: '', skill: '', minBudget: '' };
    setFilters(empty);
    load(empty);
  };

  return (
    <div className="container">
      <h1>Browse Projects</h1>

      {recommended.length > 0 && (
        <>
          <h2>Recommended for you</h2>
          {recommended.map((p) => (
            <div className="card" key={p.id}>
              <div className="row">
                <h3><Link to={`/projects/${p.id}`}>{p.title}</Link></h3>
                <span className="tag">{p.matchPercent}% skills · {p.textPercent}% text match</span>
              </div>
              <p className="muted">Budget: ${p.budget} · Client: {p.client_name}</p>
            </div>
          ))}
        </>
      )}

      <h2>All open projects</h2>
      <div className="card">
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div style={{ flex: 2 }}>
            <label>Search</label>
            <input name="search" value={filters.search} onChange={handleChange} placeholder="react, design..." />
          </div>
          <div style={{ flex: 1 }}>
            <label>Skill</label>
            <select name="skill" value={filters.skill} onChange={handleChange}>
              <option value="">Any</option>
              {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label>Min budget</label>
            <input name="minBudget" type="number" min="0" value={filters.minBudget} onChange={handleChange} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <button className="btn" onClick={() => load()}>Search</button>{' '}
            <button className="btn gray" onClick={reset}>Reset</button>
          </div>
        </div>
      </div>

      {projects.length === 0 && <p className="muted">No projects found.</p>}
      {projects.map((p) => (
        <div className="card" key={p.id}>
          <div className="row">
            <h3><Link to={`/projects/${p.id}`}>{p.title}</Link></h3>
            <b>${p.budget}</b>
          </div>
          <p className="muted">
            {p.client_name}
            {p.deadline && ` · Deadline: ${String(p.deadline).slice(0, 10)}`}
          </p>
          {p.skills && p.skills.split(',').map((s) => <span className="tag" key={s}>{s}</span>)}
        </div>
      ))}
    </div>
  );
}