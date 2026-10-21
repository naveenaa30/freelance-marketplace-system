import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function MyWork() {
  const [work, setWork] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/bids/my')
      .then((res) => setWork(res.data.bids.filter((b) => b.status === 'accepted')))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container">
      <h1>My Work</h1>
      {loading && <p className="muted">Loading...</p>}
      {!loading && work.length === 0 && (
        <p className="muted">No assigned projects yet. Win a bid to see it here.</p>
      )}
      {work.map((b) => (
        <div className="card" key={b.id}>
          <div className="row">
            <h3><Link to={`/projects/${b.project_id}`}>{b.project_title}</Link></h3>
            <span className={`status ${b.project_status}`}>{b.project_status.replace('_', ' ')}</span>
          </div>
          <p className="muted">Agreed price: ${b.amount} · {b.delivery_days} days</p>
        </div>
      ))}
    </div>
  );
}