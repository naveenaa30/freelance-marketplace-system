import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function MyBids() {
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/bids/my')
      .then((res) => setBids(res.data.bids))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container">
      <h1>My Bids</h1>
      {loading && <p className="muted">Loading...</p>}
      {!loading && bids.length === 0 && <p className="muted">You haven't placed any bids yet.</p>}
      {bids.map((b) => (
        <div className="card" key={b.id}>
          <div className="row">
            <h3><Link to={`/projects/${b.project_id}`}>{b.project_title}</Link></h3>
            <span className={`status ${b.status}`}>{b.status}</span>
          </div>
          <p><b>${b.amount}</b> · {b.delivery_days} days · Project is {b.project_status.replace('_', ' ')}</p>
          <p className="muted">{b.proposal}</p>
        </div>
      ))}
    </div>
  );
}