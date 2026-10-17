import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Profile from './pages/Profile';
import PostProject from './pages/PostProject';
import MyProjects from './pages/MyProjects';
import BrowseProjects from './pages/BrowseProjects';

const guard = (element, roles) => (
  <ProtectedRoute allowedRoles={roles}>{element}</ProtectedRoute>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={guard(<Home />)} />
          <Route path="/profile" element={guard(<Profile />, ['client', 'freelancer'])} />
          <Route path="/post-project" element={guard(<PostProject />, ['client'])} />
          <Route path="/my-projects" element={guard(<MyProjects />, ['client'])} />
          <Route path="/browse" element={guard(<BrowseProjects />, ['freelancer'])} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;