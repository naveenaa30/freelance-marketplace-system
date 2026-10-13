const pool = require('../config/db');
const { recommendFreelancers, recommendProjects } = require('../services/recommend');

// GET /api/recommendations/project/:id   (client, owner only)
exports.forProject = async (req, res) => {
  try {
    const [owned] = await pool.query(
      'SELECT id FROM projects WHERE id = ? AND client_id = ?',
      [req.params.id, req.user.id]
    );
    if (!owned.length) return res.status(404).json({ message: 'Project not found' });

    const freelancers = await recommendFreelancers(req.params.id);
    res.json({ freelancers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/recommendations/projects   (freelancer)
exports.forFreelancer = async (req, res) => {
  try {
    const projects = await recommendProjects(req.user.id);
    res.json({ projects });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};