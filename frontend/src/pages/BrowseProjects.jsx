import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

const EMPTY = { search: '', skill: '', minBudget: '', sort: 'newest' };

export default function BrowseProjects() {
  const [skills, setSkills] = useState([]);
  const [filters, setFilters] = useState(EMPTY);
  const [projects, setProjects] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, pages: 1 });

  const load = async (f = filters, p = 1) => {
    const params = { sort: f.sort, page: p, limit: 6 };
    if (f.search) params.search = f.search;
    if (f.skill) params.skill = f.skill;
    if (f.minBudget) params.minBudget = f.minBudget;
    try {
      const res = await api.get('/projects', { params });
      setProjects(res.data.projects);
      setMeta({ total: res.data.total, pages: res.data.pages });
      setPage(res.data.page);
    } catch {
      setProjects([]);
      setMeta({ total: 0, pages: 1 });
    }
  };

  useEffect(() => {
    api.get('/skills').then((r) => setSkills(r.data.skills)).catch(() => {});
    api.get('/recommendations/projects').then((r) => setRecommended(r.data.projects)).catch(() => {});
    load(EMPTY, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

  // changing the sort order reloads straight away from page 1
  const handleSort = (e) => {
    const next = { ...filters, sort: e.target.value };
    setFilters(next);
    load(next, 1);
  };

  const reset = () => {
    setFilters(EMPTY);
    load(EMPTY, 1);
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
          <div style={{ flex: 1 }}>
            <label>Sort by</label>
            <select name="sort" value={filters.sort} onChange={handleSort}>
              <option value="newest">Newest first</option>
              <option value="budget_high">Budget: high to low</option>
              <option value="budget_low">Budget: low to high</option>
              <option value="deadline">Deadline: soonest</option>
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <button className="btn" onClick={() => load(filters, 1)}>Search</button>{' '}
            <button className="btn gray" onClick={reset}>Reset</button>
          </div>
        </div>
      </div>

      <p className="muted">{meta.total} project{meta.total === 1 ? '' : 's'} found</p>
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

      {meta.pages > 1 && (
        <div className="row" style={{ justifyContent: 'center', marginTop: 8 }}>
          <button className="btn small gray" disabled={page <= 1} onClick={() => load(filters, page - 1)}>
            Previous
          </button>
          <span>Page {page} of {meta.pages}</span>
          <button className="btn small gray" disabled={page >= meta.pages} onClick={() => load(filters, page + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}