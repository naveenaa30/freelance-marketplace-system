import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import AdminDashboard from './admin/AdminDashboard';

export default function Home() {
  const { user } = useAuth();
  const [stats, setStats] = useState({});

  useEffect(() => {
    if (user.role === 'admin') return;
    const load = async () => {
      try {
        if (user.role === 'client') {
          const { data } = await api.get('/projects/my');
          setStats({
            'My projects': data.projects.length,
            Open: data.projects.filter((p) => p.status === 'open').length,
            'In progress': data.projects.filter((p) => ['assigned', 'in_progress'].includes(p.status)).length,
            Completed: data.projects.filter((p) => p.status === 'completed').length
          });
        } else if (user.role === 'freelancer') {
          const { data } = await api.get('/bids/my');
          setStats({
            'My bids': data.bids.length,
            Pending: data.bids.filter((b) => b.status === 'pending').length,
            Accepted: data.bids.filter((b) => b.status === 'accepted').length
          });
        }
      } catch {
        /* ignore */
      }
    };
    load();
  }, [user.role]);

  if (user.role === 'admin') return <AdminDashboard />;

  return (
    <div className="container">
      <h1>Welcome, {user.name}</h1>
      <p className="muted">Signed in as a {user.role}.</p>
      <div className="grid">
        {Object.entries(stats).map(([label, value]) => (
          <div className="card stat" key={label}><b>{value}</b>{label}</div>
        ))}
      </div>
      {user.role === 'client' && <Link className="btn" to="/post-project">Post a new project</Link>}
      {user.role === 'freelancer' && <Link className="btn" to="/browse">Browse projects</Link>}
    </div>
  );
}