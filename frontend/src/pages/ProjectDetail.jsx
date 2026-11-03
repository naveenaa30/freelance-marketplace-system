import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import MilestonePanel from '../components/MilestonePanel';
import ReviewPanel from '../components/ReviewPanel';
import ReportButton from '../components/ReportButton';

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [skills, setSkills] = useState([]);
  const [bids, setBids] = useState([]);
  const [recs, setRecs] = useState([]);
  const [bidForm, setBidForm] = useState({ amount: '', delivery_days: '', proposal: '' });
  const [tick, setTick] = useState(0);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const isOwner = user.role === 'client' && project?.client_id === user.id;
  const isAssignedFreelancer =
    user.role === 'freelancer' && project?.assigned_freelancer_id === user.id;
  const showLifecycle =
    project &&
    ['assigned', 'in_progress', 'completed'].includes(project.status) &&
    (isOwner || isAssignedFreelancer);
  const reviewTarget = isOwner
    ? { id: project?.assigned_freelancer_id, name: project?.assigned_freelancer_name }
    : { id: project?.client_id, name: project?.client_name };

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/projects/${id}`);
        setProject(data.project);
        setSkills(data.skills);

        if (user.role === 'client' && data.project.client_id === user.id) {
          const [b, r] = await Promise.all([
            api.get(`/projects/${id}/bids`),
            api.get(`/recommendations/project/${id}`)
          ]);
          setBids(b.data.bids);
          setRecs(r.data.freelancers);
        }
      } catch {
        setProject(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, user.id, user.role, tick]);

  const handleBidChange = (e) => setBidForm({ ...bidForm, [e.target.name]: e.target.value });

  const submitBid = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');
    try {
      await api.post(`/projects/${id}/bids`, bidForm);
      setMsg('Bid submitted. The client has been notified.');
      setBidForm({ amount: '', delivery_days: '', proposal: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit bid');
    }
  };

  const acceptBid = async (bidId) => {
    if (!window.confirm('Accept this bid? All other bids will be rejected.')) return;
    setMsg('');
    setError('');
    try {
      await api.post(`/bids/${bidId}/accept`);
      setMsg('Bid accepted. The project is now assigned.');
      setTick((t) => t + 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not accept bid');
    }
  };

  if (loading) return <div className="container"><p className="muted">Loading...</p></div>;
  if (!project) return <div className="container"><p className="error">Project not found.</p></div>;

  return (
    <div className="container">
      <div className="card">
        <div className="row">
          <h1 style={{ margin: 0 }}>{project.title}</h1>
          <span className={`status ${project.status}`}>{project.status.replace('_', ' ')}</span>
        </div>
        <p className="muted">
          Client: {project.client_name} · Budget: ${project.budget}
          {project.deadline && ` · Deadline: ${String(project.deadline).slice(0, 10)}`}
          {` · Progress: ${project.progress}%`}
        </p>
        <p>{project.description || 'No description provided.'}</p>
        {skills.map((s) => <span className="tag" key={s.id}>{s.name}</span>)}
      </div>

      {msg && <div className="success">{msg}</div>}
      {error && <div className="error">{error}</div>}

      {showLifecycle && (
        <MilestonePanel
          projectId={project.id}
          projectStatus={project.status}
          isOwner={isOwner}
          isAssignedFreelancer={isAssignedFreelancer}
          onChanged={() => setTick((t) => t + 1)}
        />
      )}

      {showLifecycle && project.status === 'completed' && (
        <ReviewPanel
          projectId={project.id}
          otherUserId={reviewTarget.id}
          otherUserName={reviewTarget.name}
        />
      )}

      {user.role === 'freelancer' && project.status === 'open' && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Place a bid</h2>
          <form onSubmit={submitBid}>
            <label>Your price ($)</label>
            <input name="amount" type="number" min="1" value={bidForm.amount} onChange={handleBidChange} required />
            <label>Delivery time (days)</label>
            <input name="delivery_days" type="number" min="1" value={bidForm.delivery_days} onChange={handleBidChange} required />
            <label>Proposal</label>
            <textarea name="proposal" rows="4" value={bidForm.proposal} onChange={handleBidChange} required />
            <button className="btn" type="submit">Submit bid</button>
          </form>
        </div>
      )}

      {user.role === 'freelancer' && project.status !== 'open' && !isAssignedFreelancer && (
        <p className="muted">This project is no longer accepting bids.</p>
      )}

      {isOwner && recs.length > 0 && project.status === 'open' && (
        <>
          <h2>Recommended freelancers</h2>
          {recs.map((f) => (
            <div className="card" key={f.id}>
              <div className="row">
                <h3>
                  <Link to={`/freelancers/${f.id}`}>{f.name}</Link>
                  {f.title && <span className="muted"> · {f.title}</span>}
                </h3>
                <span className="tag">Score {f.score} · {f.matchPercent}% skills · {f.textPercent}% text match</span>
              </div>
              <p className="muted">
                Rating {Number(f.avg_rating).toFixed(1)} / 5 · {f.experience_years} yrs experience · {f.completed_projects} projects completed
              </p>
            </div>
          ))}
        </>
      )}

      {isOwner && (
        <>
          <h2>Bids ({bids.length})</h2>
          {bids.length === 0 && <p className="muted">No bids yet.</p>}
          {bids.map((b) => (
            <div className="card" key={b.id}>
              <div className="row">
                <h3>
                  <Link to={`/freelancers/${b.freelancer_id}`}>{b.freelancer_name}</Link>
                  {b.title && <span className="muted"> · {b.title}</span>}
                </h3>
                <span className={`status ${b.status}`}>{b.status}</span>
              </div>
              <p>
                <b>${b.amount}</b> · {b.delivery_days} days
                <span className="muted"> · Rating {Number(b.avg_rating || 0).toFixed(1)} · {b.experience_years || 0} yrs · {b.completed_projects || 0} completed</span>
              </p>
              <p>{b.proposal}</p>
              {project.status === 'open' && b.status === 'pending' && (
                <button className="btn small" onClick={() => acceptBid(b.id)}>Accept this bid</button>
              )}
            </div>
          ))}
        </>
      )}

      {(isOwner || isAssignedFreelancer) && project.status !== 'open' && (
        <ReportButton
          projectId={project.id}
          reportedUserId={isOwner ? project.assigned_freelancer_id : project.client_id}
        />
      )}
    </div>
  );
}