import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function AdminProjects() {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    api.get('/admin/projects')
      .then((res) => setProjects(res.data.projects))
      .catch(() => {});
  }, []);

  return (
    <div className="container">
      <h1>All Projects</h1>
      <div className="card" style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr><th>ID</th><th>Title</th><th>Client</th><th>Freelancer</th><th>Budget</th><th>Status</th><th>Progress</th></tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.title}</td>
                <td>{p.client_name}</td>
                <td>{p.freelancer_name || '-'}</td>
                <td>${p.budget}</td>
                <td><span className={`status ${p.status}`}>{p.status.replace('_', ' ')}</span></td>
                <td>{p.progress}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}