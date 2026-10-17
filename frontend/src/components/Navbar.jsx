import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LINKS = {
  client: [['/', 'Dashboard'], ['/post-project', 'Post Project'], ['/my-projects', 'My Projects'], ['/chat', 'Chat'], ['/notifications', 'Notifications'], ['/profile', 'Profile']],
  freelancer: [['/', 'Dashboard'], ['/browse', 'Browse Projects'], ['/my-bids', 'My Bids'], ['/assigned', 'My Work'], ['/chat', 'Chat'], ['/notifications', 'Notifications'], ['/profile', 'Profile']],
  admin: [['/', 'Dashboard'], ['/admin/users', 'Users'], ['/admin/projects', 'Projects'], ['/admin/reports', 'Reports']]
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="navbar">
      <Link to="/"><strong>Freelance Marketplace</strong></Link>
      <div className="links">
        {user ? (
          <>
            {LINKS[user.role].map(([to, label]) => (
              <Link key={to} to={to}>{label}</Link>
            ))}
            <span style={{ marginLeft: 16 }}>{user.name} ({user.role})</span>
            <button onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </div>
  );
}