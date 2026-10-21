import { useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export default function Chat() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [people, setPeople] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  const loadPeople = async () => {
    try {
      const [c, v] = await Promise.all([api.get('/messages/contacts'), api.get('/messages/conversations')]);
      const map = new Map();
      c.data.contacts.forEach((p) => map.set(p.id, { ...p, unread: 0, last_message: '' }));
      v.data.conversations.forEach((p) => map.set(p.id, { ...map.get(p.id), ...p }));
      setPeople([...map.values()]);
    } catch {
      setPeople([]);
    }
  };

  useEffect(() => {
    loadPeople();
  }, []);

  const open = async (person) => {
    setSelected(person);
    setError('');
    try {
      const res = await api.get(`/messages/${person.id}`);
      setMessages(res.data.messages);
      setPeople((list) => list.map((p) => (p.id === person.id ? { ...p, unread: 0 } : p)));
    } catch {
      setMessages([]);
    }
  };

  // live incoming messages
  useEffect(() => {
    if (!socket) return;
    const onMessage = (m) => {
      if (selected && m.sender_id === selected.id) {
        setMessages((list) => [...list, m]);
        api.get(`/messages/${selected.id}`).catch(() => {}); // marks as read
      } else {
        loadPeople();
      }
    };
    socket.on('new_message', onMessage);
    return () => socket.off('new_message', onMessage);
  }, [socket, selected]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = (e) => {
    e.preventDefault();
    const content = text.trim();
    if (!content || !selected || !socket) return;
    setError('');
    socket.emit('send_message', { receiverId: selected.id, content }, (res) => {
      if (res?.ok) {
        setMessages((list) => [...list, res.message]);
        setText('');
        loadPeople();
      } else {
        setError(res?.error || 'Could not send');
      }
    });
  };

  return (
    <div className="container">
      <h1>Chat</h1>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div className="card" style={{ width: 260, flexShrink: 0 }}>
          <h3>People</h3>
          {people.length === 0 && (
            <p className="muted">No contacts yet. You can chat once a freelancer has bid on a client's project.</p>
          )}
          {people.map((p) => (
            <div
              key={p.id}
              onClick={() => open(p)}
              style={{
                padding: 10, borderRadius: 6, cursor: 'pointer', marginBottom: 6,
                background: selected?.id === p.id ? '#e0e7ff' : '#f1f5f9'
              }}
            >
              <b>{p.name}</b> {p.unread > 0 && <span className="badge">{p.unread}</span>}
              <div className="muted">{p.role}{p.last_message && ` · ${p.last_message.slice(0, 24)}`}</div>
            </div>
          ))}
        </div>

        <div className="card" style={{ flex: 1, minHeight: 360 }}>
          {!selected && <p className="muted">Select a person to start chatting.</p>}
          {selected && (
            <>
              <h3>{selected.name}</h3>
              <div style={{ height: 300, overflowY: 'auto', marginBottom: 10 }}>
                {messages.map((m) => {
                  const mine = m.sender_id === user.id;
                  return (
                    <div key={m.id} style={{ textAlign: mine ? 'right' : 'left', marginBottom: 8 }}>
                      <span style={{
                        display: 'inline-block', padding: '8px 12px', borderRadius: 12, maxWidth: '70%',
                        background: mine ? '#2563eb' : '#e2e8f0', color: mine ? 'white' : '#1e293b', textAlign: 'left'
                      }}>
                        {m.content}
                      </span>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              {error && <div className="error">{error}</div>}
              <form onSubmit={send} style={{ display: 'flex', gap: 8 }}>
                <input style={{ margin: 0 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..." />
                <button className="btn" type="submit">Send</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}