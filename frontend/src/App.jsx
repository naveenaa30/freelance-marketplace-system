import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Profile from './pages/Profile';
import PostProject from './pages/PostProject';
import MyProjects from './pages/MyProjects';
import BrowseProjects from './pages/BrowseProjects';
import ProjectDetail from './pages/ProjectDetail';
import MyBids from './pages/MyBids';
import MyWork from './pages/MyWork';
import Chat from './pages/Chat';
import Notifications from './pages/Notifications';
import AdminUsers from './pages/admin/AdminUsers';
import AdminProjects from './pages/admin/AdminProjects';
import AdminReports from './pages/admin/AdminReports';
import Effects from './components/Effects';

const guard = (element, roles) => (
  <ProtectedRoute allowedRoles={roles}>{element}</ProtectedRoute>
);

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
        <Effects/>
          <Navbar />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={guard(<Home />)} />
            <Route path="/profile" element={guard(<Profile />, ['client', 'freelancer'])} />
            <Route path="/post-project" element={guard(<PostProject />, ['client'])} />
            <Route path="/my-projects" element={guard(<MyProjects />, ['client'])} />
            <Route path="/browse" element={guard(<BrowseProjects />, ['freelancer'])} />
            <Route path="/projects/:id" element={guard(<ProjectDetail />, ['client', 'freelancer'])} />
            <Route path="/my-bids" element={guard(<MyBids />, ['freelancer'])} />
            <Route path="/assigned" element={guard(<MyWork />, ['freelancer'])} />
            <Route path="/chat" element={guard(<Chat />, ['client', 'freelancer'])} />
            <Route path="/notifications" element={guard(<Notifications />, ['client', 'freelancer'])} />
                        <Route path="/admin/users" element={guard(<AdminUsers />, ['admin'])} />
            <Route path="/admin/projects" element={guard(<AdminProjects />, ['admin'])} />
            <Route path="/admin/reports" element={guard(<AdminReports />, ['admin'])} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;