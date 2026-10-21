import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import api from '../../api/axios';

const COLORS = ['#2563eb', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/analytics')
      .then((res) => setData(res.data))
      .catch(() => setError('Could not load analytics'));
  }, []);

  if (error) return <div className="container"><p className="error">{error}</p></div>;
  if (!data) return <div className="container"><p className="muted">Loading...</p></div>;

  const num = (rows, key) => rows.map((r) => ({ ...r, [key]: Number(r[key]) }));
  const usersByRole = num(data.usersByRole, 'count');
  const projectsByStatus = num(data.projectsByStatus, 'count');
  const projectsPerMonth = num(data.projectsPerMonth, 'count');
  const t = data.totals;

  return (
    <div className="container">
      <h1>Admin Dashboard</h1>

      <div className="grid">
        <div className="card stat"><b>{t.total_projects}</b>Projects</div>
        <div className="card stat"><b>{t.total_bids}</b>Bids</div>
        <div className="card stat"><b>{t.total_messages}</b>Messages</div>
        <div className="card stat"><b>{t.open_reports}</b>Open reports</div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <div className="card">
          <h3>Projects by status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={projectsByStatus}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3>Users by role</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={usersByRole} dataKey="count" nameKey="role" outerRadius={80} label>
                {usersByRole.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h3>Projects per month</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={projectsPerMonth}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#22c55e" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h3>Top freelancers</h3>
        <table>
          <thead>
            <tr><th>Name</th><th>Rating</th><th>Completed projects</th></tr>
          </thead>
          <tbody>
            {data.topFreelancers.map((f) => (
              <tr key={f.id}>
                <td>{f.name}</td>
                <td>{Number(f.avg_rating).toFixed(2)}</td>
                <td>{f.completed_projects}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}