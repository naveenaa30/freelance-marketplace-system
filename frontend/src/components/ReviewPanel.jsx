import { useEffect, useState } from 'react';
import api from '../api/axios';

export default function ReviewPanel({ projectId, otherUserId, otherUserName }) {
  const [form, setForm] = useState({ rating: 5, comment: '' });
  const [reviews, setReviews] = useState([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!otherUserId) return;
    api.get(`/reviews/user/${otherUserId}`)
      .then((res) => setReviews(res.data.reviews))
      .catch(() => {});
  }, [otherUserId, tick]);

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');
    try {
      await api.post('/reviews', { projectId, rating: Number(form.rating), comment: form.comment });
      setMsg('Review submitted. Thank you!');
      setTick((t) => t + 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit review');
    }
  };

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Review {otherUserName}</h2>
      {msg && <div className="success">{msg}</div>}
      {error && <div className="error">{error}</div>}
      <form onSubmit={submit}>
        <label>Rating</label>
        <select value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })}>
          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>)}
        </select>
        <label>Comment</label>
        <textarea rows="3" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
        <button className="btn" type="submit">Submit review</button>
      </form>

      {reviews.length > 0 && (
        <>
          <h3>Reviews for {otherUserName}</h3>
          {reviews.map((r) => (
            <p key={r.id}>
              {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)} <span className="muted">by {r.reviewer_name} on "{r.project_title}"</span>
              <br />{r.comment}
            </p>
          ))}
        </>
      )}
    </div>
  );
}