import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useSocket } from '../context/SocketContext';

export default function Notifications() {
  const { unread, setUnread } = useSocket();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    api.get('/notifications')
      .then((res) => setItems(res.data.notifications))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, [unread]);

  const markRead = async () => {
    await api.put('/notifications/read');
    setUnread(0);
    load();
  };

  return (
    <div className="container">
      <div className="row">
        <h1>Notifications</h1>
        <button className="btn" onClick={markRead}>Mark all as read</button>
      </div>
      {loading && <p className="muted">Loading...</p>}
      {!loading && items.length === 0 && <p className="muted">No notifications yet.</p>}
      {items.map((n) => (
        <div className="card" key={n.id} style={{ borderLeft: n.is_read ? 'none' : '4px solid #2563eb' }}>
          <div>{n.message}</div>
          <div className="muted">{new Date(n.created_at).toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}