const pool = require('../config/db');
const { notify } = require('../services/notify');
const { getProjectAccess } = require('../services/projectAccess');

// recalculate progress and project status from milestones
async function refreshProgress(projectId) {
  const [[counts]] = await pool.query(
    `SELECT COUNT(*) AS total, SUM(status = 'done') AS done,
            SUM(status = 'in_progress') AS working
     FROM milestones WHERE project_id = ?`,
    [projectId]
  );
  const total = Number(counts.total);
  const done = Number(counts.done || 0);
  const working = Number(counts.working || 0);
  const progress = total ? Math.round((done / total) * 100) : 0;

  // move assigned -> in_progress once any work starts
  await pool.query(
    `UPDATE projects
     SET progress = ?,
         status = IF(status = 'assigned' AND (? > 0 OR ? > 0), 'in_progress', status)
     WHERE id = ?`,
    [progress, working, done, projectId]
  );
  return progress;
}

// POST /api/projects/:id/milestones   (client owner)
exports.addMilestone = async (req, res) => {
  const { title, description, due_date } = req.body;
  if (!title) return res.status(400).json({ message: 'Title is required' });

  try {
    const access = await getProjectAccess(req.params.id, req.user.id);
    if (!access || !access.isClient) {
      return res.status(404).json({ message: 'Project not found' });
    }
    if (!['assigned', 'in_progress'].includes(access.project.status)) {
      return res.status(400).json({ message: 'Milestones can only be added to assigned projects' });
    }

    const [result] = await pool.query(
      'INSERT INTO milestones (project_id, title, description, due_date) VALUES (?, ?, ?, ?)',
      [req.params.id, title, description || null, due_date || null]
    );
    const progress = await refreshProgress(req.params.id);

    if (access.freelancerId) {
      await notify(access.freelancerId, `New milestone "${title}" on "${access.project.title}"`);
    }
    res.status(201).json({ message: 'Milestone added', milestoneId: result.insertId, progress });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/projects/:id/milestones
exports.getMilestones = async (req, res) => {
  try {
    const access = await getProjectAccess(req.params.id, req.user.id);
    if (!access) return res.status(404).json({ message: 'Project not found' });

    const [milestones] = await pool.query(
      'SELECT id, title, description, due_date, status FROM milestones WHERE project_id = ? ORDER BY id',
      [req.params.id]
    );
    res.json({
      milestones,
      progress: access.project.progress,
      projectStatus: access.project.status
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/milestones/:id   body: { status }   (assigned freelancer)
exports.updateMilestone = async (req, res) => {
  const { status } = req.body;
  if (!['pending', 'in_progress', 'done'].includes(status)) {
    return res.status(400).json({ message: 'Status must be pending, in_progress or done' });
  }

  try {
    const [rows] = await pool.query('SELECT id, project_id, title FROM milestones WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Milestone not found' });
    const milestone = rows[0];

    const access = await getProjectAccess(milestone.project_id, req.user.id);
    if (!access || !access.isFreelancer) {
      return res.status(404).json({ message: 'Milestone not found' });
    }
    if (access.project.status === 'completed') {
      return res.status(400).json({ message: 'Project is already completed' });
    }

    await pool.query('UPDATE milestones SET status = ? WHERE id = ?', [status, milestone.id]);
    const progress = await refreshProgress(milestone.project_id);

    await notify(
      access.project.client_id,
      `Milestone "${milestone.title}" is now ${status.replace('_', ' ')} (${progress}% done)`
    );
    res.json({ message: 'Milestone updated', progress });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/projects/:id/complete   (client owner)
exports.completeProject = async (req, res) => {
  try {
    const access = await getProjectAccess(req.params.id, req.user.id);
    if (!access || !access.isClient) {
      return res.status(404).json({ message: 'Project not found' });
    }
    if (!['assigned', 'in_progress'].includes(access.project.status)) {
      return res.status(400).json({ message: 'Project cannot be completed from its current status' });
    }

    const [[pending]] = await pool.query(
      "SELECT COUNT(*) AS n FROM milestones WHERE project_id = ? AND status <> 'done'",
      [req.params.id]
    );
    if (Number(pending.n) > 0) {
      return res.status(400).json({ message: 'All milestones must be done first' });
    }

    await pool.query("UPDATE projects SET status = 'completed', progress = 100 WHERE id = ?", [req.params.id]);
    await pool.query(
      `UPDATE freelancer_profiles
       SET completed_projects = (
         SELECT COUNT(*) FROM assigned_projects ap
         JOIN projects p ON p.id = ap.project_id
         WHERE ap.freelancer_id = ? AND p.status = 'completed')
       WHERE user_id = ?`,
      [access.freelancerId, access.freelancerId]
    );
    await notify(access.freelancerId, `"${access.project.title}" was marked as completed`);
    res.json({ message: 'Project completed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};