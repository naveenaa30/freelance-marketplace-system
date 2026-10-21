const pool = require('../config/db');

const SKILLS_SUBQUERY = `(SELECT GROUP_CONCAT(s.name SEPARATOR ',')
  FROM project_skills ps JOIN skills s ON s.id = ps.skill_id
  WHERE ps.project_id = p.id) AS skills`;

// POST /api/projects
exports.createProject = async (req, res) => {
  const { title, description, budget, deadline, skillIds } = req.body;
  if (!title || !budget) {
    return res.status(400).json({ message: 'Title and budget are required' });
  }
  if (Number(budget) <= 0) {
    return res.status(400).json({ message: 'Budget must be greater than 0' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      'INSERT INTO projects (client_id, title, description, budget, deadline) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, title, description || null, budget, deadline || null]
    );
    const projectId = result.insertId;

    if (Array.isArray(skillIds)) {
      for (const skillId of skillIds) {
        await conn.query(
          'INSERT INTO project_skills (project_id, skill_id) VALUES (?, ?)',
          [projectId, skillId]
        );
      }
    }
    await conn.commit();
    res.status(201).json({ message: 'Project created', projectId });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    conn.release();
  }
};

// GET /api/projects?skill=1&minBudget=100&search=react&status=open
exports.getProjects = async (req, res) => {
  try {
    const { skill, minBudget, search, status } = req.query;
    const where = [];
    const params = [];

    where.push('p.status = ?');
    params.push(status || 'open');

    if (minBudget) {
      where.push('p.budget >= ?');
      params.push(Number(minBudget));
    }
    if (search) {
      where.push('(p.title LIKE ? OR p.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (skill) {
      where.push('p.id IN (SELECT project_id FROM project_skills WHERE skill_id = ?)');
      params.push(Number(skill));
    }

    const [rows] = await pool.query(
      `SELECT p.id, p.title, p.description, p.budget, p.deadline, p.status,
              p.created_at, u.name AS client_name, ${SKILLS_SUBQUERY}
       FROM projects p
       JOIN users u ON u.id = p.client_id
       WHERE ${where.join(' AND ')}
       ORDER BY p.created_at DESC`,
      params
    );
    res.json({ projects: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/projects/my
exports.getMyProjects = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.id, p.title, p.budget, p.deadline, p.status, p.progress, p.created_at,
              (SELECT COUNT(*) FROM bids b WHERE b.project_id = p.id) AS bid_count,
              ${SKILLS_SUBQUERY}
       FROM projects p
       WHERE p.client_id = ?
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    res.json({ projects: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/projects/:id   (now also returns the assigned freelancer)
exports.getProject = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, u.name AS client_name,
              ap.freelancer_id AS assigned_freelancer_id,
              f.name AS assigned_freelancer_name
       FROM projects p
       JOIN users u ON u.id = p.client_id
       LEFT JOIN assigned_projects ap ON ap.project_id = p.id
       LEFT JOIN users f ON f.id = ap.freelancer_id
       WHERE p.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Project not found' });

    const [skills] = await pool.query(
      `SELECT s.id, s.name FROM project_skills ps
       JOIN skills s ON s.id = ps.skill_id
       WHERE ps.project_id = ?`,
      [req.params.id]
    );
    res.json({ project: rows[0], skills });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/projects/:id
exports.updateProject = async (req, res) => {
  const { title, description, budget, deadline, skillIds } = req.body;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      'SELECT status FROM projects WHERE id = ? AND client_id = ?',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Project not found' });
    if (rows[0].status !== 'open') {
      return res.status(400).json({ message: 'Only open projects can be edited' });
    }

    await conn.beginTransaction();
    await conn.query(
      `UPDATE projects SET title = ?, description = ?, budget = ?, deadline = ?
       WHERE id = ? AND client_id = ?`,
      [title, description || null, budget, deadline || null, req.params.id, req.user.id]
    );

    if (Array.isArray(skillIds)) {
      await conn.query('DELETE FROM project_skills WHERE project_id = ?', [req.params.id]);
      for (const skillId of skillIds) {
        await conn.query(
          'INSERT INTO project_skills (project_id, skill_id) VALUES (?, ?)',
          [req.params.id, skillId]
        );
      }
    }
    await conn.commit();
    res.json({ message: 'Project updated' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    conn.release();
  }
};

// DELETE /api/projects/:id
exports.deleteProject = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT status FROM projects WHERE id = ? AND client_id = ?',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Project not found' });
    if (rows[0].status !== 'open') {
      return res.status(400).json({ message: 'Only open projects can be deleted' });
    }
    await pool.query('DELETE FROM projects WHERE id = ? AND client_id = ?',
      [req.params.id, req.user.id]);
    res.json({ message: 'Project deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};