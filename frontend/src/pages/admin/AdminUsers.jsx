import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  const load = () =>
    api.get('/admin/users')
      .then((res) => setUsers(res.data.users))
      .catch(() => setError('Could not load users'));

  useEffect(() => {
    load();
  }, []);

  const toggle = async (u) => {
    setError('');
    try {
      await api.put(`/admin/users/${u.id}/status`, { is_active: !u.is_active });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    }
  };

  return (
    <div className="container">
      <h1>Users</h1>
      {error && <div className="error">{error}</div>}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>
                  <span className={`status ${u.is_active ? 'open' : 'rejected'}`}>
                    {u.is_active ? 'active' : 'blocked'}
                  </span>
                </td>
                <td>
                  {u.role !== 'admin' && (
                    <button className={`btn small ${u.is_active ? 'danger' : ''}`} onClick={() => toggle(u)}>
                      {u.is_active ? 'Block' : 'Unblock'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}