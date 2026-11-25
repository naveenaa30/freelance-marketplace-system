import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const fmt = (n) => `$${Number(n).toFixed(2)}`;
const LABEL = {
  topup: 'Wallet top-up',
  escrow_hold: 'Held in escrow',
  escrow_release: 'Payment received'
};

export default function Wallet() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [amount, setAmount] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = () =>
    api.get('/wallet')
      .then((res) => setData(res.data))
      .catch(() => setError('Could not load wallet'));

  useEffect(() => {
    load();
  }, []);

  const topUp = async (value) => {
    setMsg('');
    setError('');
    try {
      await api.post('/wallet/topup', { amount: Number(value) });
      setMsg(`Added ${fmt(value)} of simulated money`);
      setAmount('');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Top-up failed');
    }
  };

  if (!data) return <div className="container"><p className="muted">{error || 'Loading...'}</p></div>;

  return (
    <div className="container">
      <h1>Wallet</h1>
      <p className="muted">This is a payment simulation. No real money is used.</p>

      <div className="grid">
        <div className="card stat"><b>{fmt(data.balance)}</b>Available balance</div>
        {user.role === 'client' && (
          <div className="card stat"><b>{fmt(data.heldPaying)}</b>Held in escrow</div>
        )}
        {user.role === 'freelancer' && (
          <div className="card stat"><b>{fmt(data.heldIncoming)}</b>Pending release</div>
        )}
      </div>

      {msg && <div className="success">{msg}</div>}
      {error && <div className="error">{error}</div>}

      {user.role === 'client' && (
        <div className="card">
          <h3>Add simulated money</h3>
          <div style={{ marginBottom: 12 }}>
            {[500, 1000, 5000].map((v) => (
              <button key={v} className="btn small gray" style={{ marginRight: 8 }} onClick={() => topUp(v)}>
                +${v}
              </button>
            ))}
          </div>
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label>Custom amount</label>
              <input type="number" min="1" max="100000" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <button className="btn" disabled={!amount} onClick={() => topUp(amount)}>Add money</button>
            </div>
          </div>
        </div>
      )}

      <h2>Transactions</h2>
      {data.transactions.length === 0 && <p className="muted">No transactions yet.</p>}
      {data.transactions.map((t) => (
        <div className="card" key={t.id}>
          <div className="row">
            <div>
              <b>{LABEL[t.type] || t.type}</b>
              {t.project_title && <span className="muted"> · {t.project_title}</span>}
              <div className="muted">{new Date(t.created_at).toLocaleString()}</div>
            </div>
            <b style={{ color: Number(t.amount) >= 0 ? '#16a34a' : '#dc2626' }}>
              {Number(t.amount) >= 0 ? '+' : '-'}{fmt(Math.abs(t.amount))}
            </b>
          </div>
        </div>
      ))}
    </div>
  );
}