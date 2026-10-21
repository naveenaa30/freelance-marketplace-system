import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import api from '../api/axios';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [socket, setSocket] = useState(null);
  const [unread, setUnread] = useState(0);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!userId) return;

    const s = io('http://localhost:5000', {
      auth: { token: localStorage.getItem('token') }
    });
    setSocket(s);

    api.get('/notifications')
      .then((res) => setUnread(res.data.unread))
      .catch(() => {});

    s.on('notification', (n) => {
      setUnread((u) => u + 1);
      setToast(n.message);
      setTimeout(() => setToast(''), 4000);
    });

    return () => {
      s.disconnect();
      setSocket(null);
      setUnread(0);
    };
  }, [userId]);

  return (
    <SocketContext.Provider value={{ socket, unread, setUnread }}>
      {children}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 20, right: 20, background: '#1e293b', color: 'white',
          padding: '12px 18px', borderRadius: 8, boxShadow: '0 4px 14px rgba(0,0,0,0.25)', zIndex: 50
        }}>
          {toast}
        </div>
      )}
    </SocketContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useSocket = () => useContext(SocketContext);