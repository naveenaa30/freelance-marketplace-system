const pool = require('../config/db');
const { notify } = require('../services/notify');
const { getProjectAccess } = require('../services/projectAccess');

// POST /api/reviews   body: { projectId, rating, comment }
exports.createReview = async (req, res) => {
  const { projectId, rating, comment } = req.body;
  const score = Number(rating);
  if (!projectId || !Number.isInteger(score) || score < 1 || score > 5) {
    return res.status(400).json({ message: 'projectId and a rating from 1 to 5 are required' });
  }

  try {
    const access = await getProjectAccess(projectId, req.user.id);
    if (!access) return res.status(404).json({ message: 'Project not found' });
    if (access.project.status !== 'completed') {
      return res.status(400).json({ message: 'You can only review completed projects' });
    }

    // the reviewee is the other party
    const revieweeId = access.isClient ? access.freelancerId : access.project.client_id;

    await pool.query(
      'INSERT INTO reviews (project_id, reviewer_id, reviewee_id, rating, comment) VALUES (?, ?, ?, ?, ?)',
      [projectId, req.user.id, revieweeId, score, comment || null]
    );

    // only freelancers carry a public average rating
    if (access.isClient) {
      await pool.query(
        `UPDATE freelancer_profiles
         SET avg_rating = (SELECT ROUND(AVG(rating), 2) FROM reviews WHERE reviewee_id = ?)
         WHERE user_id = ?`,
        [revieweeId, revieweeId]
      );
    }

    await notify(revieweeId, `You received a ${score}-star review on "${access.project.title}"`);
    res.status(201).json({ message: 'Review submitted' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'You already reviewed this project' });
    }
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/reviews/user/:id
exports.getUserReviews = async (req, res) => {
  try {
    const [reviews] = await pool.query(
      `SELECT r.id, r.rating, r.comment, r.created_at,
              u.name AS reviewer_name, p.title AS project_title
       FROM reviews r
       JOIN users u ON u.id = r.reviewer_id
       JOIN projects p ON p.id = r.project_id
       WHERE r.reviewee_id = ?
       ORDER BY r.created_at DESC`,
      [req.params.id]
    );
    const [[stats]] = await pool.query(
      'SELECT COUNT(*) AS count, ROUND(AVG(rating), 2) AS average FROM reviews WHERE reviewee_id = ?',
      [req.params.id]
    );
    res.json({ reviews, count: stats.count, average: stats.average });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};