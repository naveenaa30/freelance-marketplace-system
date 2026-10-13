const pool = require('../config/db');

// POST /api/reports   body: { reportedUserId, projectId, reason }
exports.createReport = async (req, res) => {
  const { reportedUserId, projectId, reason } = req.body;
  if (!reason || !reason.trim()) {
    return res.status(400).json({ message: 'Reason is required' });
  }
  if (!reportedUserId && !projectId) {
    return res.status(400).json({ message: 'Report a user or a project' });
  }
  try {
    await pool.query(
      'INSERT INTO reports (reporter_id, reported_user_id, project_id, reason) VALUES (?, ?, ?, ?)',
      [req.user.id, reportedUserId || null, projectId || null, reason.trim()]
    );
    res.status(201).json({ message: 'Report submitted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/admin/users
exports.getUsers = async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, name, email, role, is_active, created_at FROM users ORDER BY id'
    );
    res.json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/admin/users/:id/status   body: { is_active: true|false }
exports.setUserStatus = async (req, res) => {
  const { is_active } = req.body;
  if (typeof is_active !== 'boolean') {
    return res.status(400).json({ message: 'is_active must be true or false' });
  }
  try {
    const [rows] = await pool.query('SELECT id, role FROM users WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'User not found' });
    if (rows[0].role === 'admin') {
      return res.status(400).json({ message: 'Admin accounts cannot be blocked' });
    }
    await pool.query('UPDATE users SET is_active = ? WHERE id = ?', [is_active ? 1 : 0, req.params.id]);
    res.json({ message: is_active ? 'User unblocked' : 'User blocked' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/admin/projects
exports.getProjects = async (req, res) => {
  try {
    const [projects] = await pool.query(
      `SELECT p.id, p.title, p.budget, p.status, p.progress, p.created_at,
              c.name AS client_name, f.name AS freelancer_name
       FROM projects p
       JOIN users c ON c.id = p.client_id
       LEFT JOIN assigned_projects ap ON ap.project_id = p.id
       LEFT JOIN users f ON f.id = ap.freelancer_id
       ORDER BY p.created_at DESC`
    );
    res.json({ projects });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/admin/reports
exports.getReports = async (req, res) => {
  try {
    const [reports] = await pool.query(
      `SELECT r.id, r.reason, r.status, r.created_at,
              rep.name AS reporter_name,
              ru.id AS reported_user_id, ru.name AS reported_user_name,
              p.id AS project_id, p.title AS project_title
       FROM reports r
       JOIN users rep ON rep.id = r.reporter_id
       LEFT JOIN users ru ON ru.id = r.reported_user_id
       LEFT JOIN projects p ON p.id = r.project_id
       ORDER BY r.status = 'open' DESC, r.created_at DESC`
    );
    res.json({ reports });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/admin/reports/:id   body: { status: 'resolved' | 'open' }
exports.updateReport = async (req, res) => {
  const { status } = req.body;
  if (!['open', 'resolved'].includes(status)) {
    return res.status(400).json({ message: 'Status must be open or resolved' });
  }
  try {
    const [result] = await pool.query('UPDATE reports SET status = ? WHERE id = ?', [status, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Report not found' });
    res.json({ message: 'Report updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/admin/analytics
exports.getAnalytics = async (req, res) => {
  try {
    const [usersByRole] = await pool.query('SELECT role, COUNT(*) AS count FROM users GROUP BY role');
    const [projectsByStatus] = await pool.query('SELECT status, COUNT(*) AS count FROM projects GROUP BY status');
    const [projectsPerMonth] = await pool.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count
       FROM projects GROUP BY month ORDER BY month`
    );
    const [topFreelancers] = await pool.query(
      `SELECT u.id, u.name, fp.avg_rating, fp.completed_projects
       FROM freelancer_profiles fp JOIN users u ON u.id = fp.user_id
       ORDER BY fp.avg_rating DESC, fp.completed_projects DESC LIMIT 5`
    );
    const [[totals]] = await pool.query(
      `SELECT (SELECT COUNT(*) FROM bids) AS total_bids,
              (SELECT COUNT(*) FROM projects) AS total_projects,
              (SELECT COUNT(*) FROM reports WHERE status = 'open') AS open_reports,
              (SELECT COUNT(*) FROM messages) AS total_messages`
    );
    res.json({ usersByRole, projectsByStatus, projectsPerMonth, topFreelancers, totals });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};