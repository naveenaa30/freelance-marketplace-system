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

// GET /api/projects?skill=1&minBudget=100&search=react&status=open&sort=newest&page=1&limit=6
exports.getProjects = async (req, res) => {
  try {
    const { skill, minBudget, search, status, sort } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 6, 1), 50);

    const where = ['p.status = ?'];
    const params = [status || 'open'];

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

    // whitelist: the sort value picks one of these fixed strings, it is never pasted into SQL
    const ORDER = {
      newest: 'p.created_at DESC, p.id DESC',
      budget_high: 'p.budget DESC, p.id DESC',
      budget_low: 'p.budget ASC, p.id DESC',
      deadline: 'p.deadline IS NULL, p.deadline ASC, p.id DESC'
    };
    const orderBy = ORDER[sort] || ORDER.newest;
    const whereSql = where.join(' AND ');

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM projects p WHERE ${whereSql}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT p.id, p.title, p.description, p.budget, p.deadline, p.status,
              p.created_at, u.name AS client_name, ${SKILLS_SUBQUERY}
       FROM projects p
       JOIN users u ON u.id = p.client_id
       WHERE ${whereSql}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, limit, (page - 1) * limit]
    );

    res.json({
      projects: rows,
      total,
      page,
      pages: Math.max(Math.ceil(total / limit), 1)
    });
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

// GET /api/projects/:id   (also returns the assigned freelancer)
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