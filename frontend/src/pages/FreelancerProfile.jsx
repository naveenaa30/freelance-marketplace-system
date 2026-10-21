import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';

const FILES = 'http://localhost:5000';
const isImage = (p) => /\.(png|jpe?g)$/i.test(p);

export default function FreelancerProfile() {
  const { id } = useParams();
  const [info, setInfo] = useState(null);
  const [skills, setSkills] = useState([]);
  const [portfolio, setPortfolio] = useState({ resume: null, items: [] });
  const [reviews, setReviews] = useState({ reviews: [], count: 0, average: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [f, p, r] = await Promise.all([
          api.get(`/freelancers/${id}`),
          api.get(`/portfolio/freelancer/${id}`),
          api.get(`/reviews/user/${id}`)
        ]);
        setInfo(f.data.freelancer);
        setSkills(f.data.skills);
        setPortfolio(p.data);
        setReviews(r.data);
      } catch {
        setInfo(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <div className="container"><p className="muted">Loading...</p></div>;
  if (!info) return <div className="container"><p className="error">Freelancer not found.</p></div>;

  return (
    <div className="container">
      <div className="card">
        <h1 style={{ margin: 0 }}>{info.name}</h1>
        <p className="muted">{info.title || 'Freelancer'}</p>
        <p>{info.bio || 'No bio provided.'}</p>
        <p className="muted">
          Rating {Number(info.avg_rating).toFixed(1)} / 5 · {info.experience_years} yrs experience ·
          {' '}{info.completed_projects} projects completed
          {info.hourly_rate && ` · $${info.hourly_rate}/hr`}
        </p>
        {skills.map((s) => <span className="tag" key={s.id}>{s.name}</span>)}
        {portfolio.resume && (
          <p><a className="btn small" href={`${FILES}${portfolio.resume}`} target="_blank" rel="noreferrer">Download resume</a></p>
        )}
      </div>

      <h2>Portfolio ({portfolio.items.length})</h2>
      {portfolio.items.length === 0 && <p className="muted">No portfolio items yet.</p>}
      <div className="grid">
        {portfolio.items.map((it) => (
          <div className="card" key={it.id}>
            {isImage(it.file_path) && (
              <img src={`${FILES}${it.file_path}`} alt={it.title} style={{ width: '100%', borderRadius: 10, marginBottom: 8 }} />
            )}
            <h3>{it.title}</h3>
            {it.description && <p className="muted">{it.description}</p>}
            <a href={`${FILES}${it.file_path}`} target="_blank" rel="noreferrer">Open file</a>
          </div>
        ))}
      </div>

      <h2>Reviews ({reviews.count}){reviews.average && ` · ${reviews.average} / 5`}</h2>
      {reviews.reviews.length === 0 && <p className="muted">No reviews yet.</p>}
      {reviews.reviews.map((r) => (
        <div className="card" key={r.id}>
          <div>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
          <p>{r.comment}</p>
          <p className="muted">by {r.reviewer_name} on "{r.project_title}"</p>
        </div>
      ))}
    </div>
  );
}