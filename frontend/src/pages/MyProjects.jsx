import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function MyProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/projects/my')
      .then((res) => setProjects(res.data.projects))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container">
      <div className="row">
        <h1>My Projects</h1>
        <Link className="btn" to="/post-project">+ New project</Link>
      </div>
      {loading && <p className="muted">Loading...</p>}
      {!loading && projects.length === 0 && <p className="muted">No projects yet.</p>}
      {projects.map((p) => (
        <div className="card" key={p.id}>
          <div className="row">
            <h3><Link to={`/projects/${p.id}`}>{p.title}</Link></h3>
            <span className={`status ${p.status}`}>{p.status.replace('_', ' ')}</span>
          </div>
          <p className="muted">
            Budget: ${p.budget} · Bids: {p.bid_count} · Progress: {p.progress}%
            {p.deadline && ` · Deadline: ${String(p.deadline).slice(0, 10)}`}
          </p>
          {p.skills && p.skills.split(',').map((s) => <span className="tag" key={s}>{s}</span>)}
        </div>
      ))}
    </div>
  );
}