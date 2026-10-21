import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function AdminReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    api.get('/admin/reports')
      .then((res) => setReports(res.data.reports))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const setStatus = async (id, status) => {
    await api.put(`/admin/reports/${id}`, { status });
    load();
  };

  return (
    <div className="container">
      <h1>Reports and Disputes</h1>
      {loading && <p className="muted">Loading...</p>}
      {!loading && reports.length === 0 && <p className="muted">No reports filed.</p>}
      {reports.map((r) => (
        <div className="card" key={r.id}>
          <div className="row">
            <h3>Report #{r.id}</h3>
            <span className={`status ${r.status === 'open' ? 'in_progress' : 'completed'}`}>{r.status}</span>
          </div>
          <p>{r.reason}</p>
          <p className="muted">
            Filed by {r.reporter_name}
            {r.reported_user_name && ` · against ${r.reported_user_name}`}
            {r.project_title && ` · project "${r.project_title}"`}
            {` · ${new Date(r.created_at).toLocaleString()}`}
          </p>
          {r.status === 'open' ? (
            <button className="btn small" onClick={() => setStatus(r.id, 'resolved')}>Mark resolved</button>
          ) : (
            <button className="btn small gray" onClick={() => setStatus(r.id, 'open')}>Reopen</button>
          )}
        </div>
      ))}
    </div>
  );
}