const pool = require('../config/db');
const { notify } = require('../services/notify');

// POST /api/projects/:id/bids
exports.submitBid = async (req, res) => {
  const { amount, delivery_days, proposal } = req.body;
  if (!amount || !delivery_days || !proposal) {
    return res.status(400).json({ message: 'Amount, delivery days and proposal are required' });
  }
  if (Number(amount) <= 0 || Number(delivery_days) <= 0) {
    return res.status(400).json({ message: 'Amount and delivery days must be greater than 0' });
  }

  try {
    const [projects] = await pool.query(
      'SELECT id, client_id, title, status FROM projects WHERE id = ?',
      [req.params.id]
    );
    if (!projects.length) return res.status(404).json({ message: 'Project not found' });
    const project = projects[0];
    if (project.status !== 'open') {
      return res.status(400).json({ message: 'This project is no longer open for bids' });
    }

    await pool.query(
      `INSERT INTO bids (project_id, freelancer_id, amount, delivery_days, proposal)
       VALUES (?, ?, ?, ?, ?)`,
      [project.id, req.user.id, amount, delivery_days, proposal]
    );

    await notify(project.client_id, `New bid received on "${project.title}"`);
    res.status(201).json({ message: 'Bid submitted' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'You already bid on this project' });
    }
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/projects/:id/bids   (project owner only)
exports.getProjectBids = async (req, res) => {
  try {
    const [owned] = await pool.query(
      'SELECT id FROM projects WHERE id = ? AND client_id = ?',
      [req.params.id, req.user.id]
    );
    if (!owned.length) return res.status(404).json({ message: 'Project not found' });

    const [bids] = await pool.query(
      `SELECT b.id, b.amount, b.delivery_days, b.proposal, b.status, b.created_at,
              u.id AS freelancer_id, u.name AS freelancer_name,
              fp.title, fp.avg_rating, fp.experience_years, fp.completed_projects
       FROM bids b
       JOIN users u ON u.id = b.freelancer_id
       LEFT JOIN freelancer_profiles fp ON fp.user_id = u.id
       WHERE b.project_id = ?
       ORDER BY b.created_at DESC`,
      [req.params.id]
    );
    res.json({ bids });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/bids/my
exports.getMyBids = async (req, res) => {
  try {
    const [bids] = await pool.query(
      `SELECT b.id, b.amount, b.delivery_days, b.proposal, b.status, b.created_at,
              p.id AS project_id, p.title AS project_title, p.status AS project_status
       FROM bids b
       JOIN projects p ON p.id = b.project_id
       WHERE b.freelancer_id = ?
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json({ bids });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/bids/:id/accept   (project owner only)
exports.acceptBid = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // lock the bid + project rows so two accepts can't happen at once
    const [rows] = await conn.query(
      `SELECT b.id, b.project_id, b.freelancer_id, b.status AS bid_status,
              p.client_id, p.title, p.status AS project_status
       FROM bids b JOIN projects p ON p.id = b.project_id
       WHERE b.id = ? FOR UPDATE`,
      [req.params.id]
    );

    if (!rows.length || rows[0].client_id !== req.user.id) {
      await conn.rollback();
      return res.status(404).json({ message: 'Bid not found' });
    }
    const bid = rows[0];
    if (bid.project_status !== 'open') {
      await conn.rollback();
      return res.status(400).json({ message: 'Project is already assigned' });
    }
    if (bid.bid_status !== 'pending') {
      await conn.rollback();
      return res.status(400).json({ message: 'Bid is not pending' });
    }

    await conn.query("UPDATE bids SET status = 'accepted' WHERE id = ?", [bid.id]);
    await conn.query(
      "UPDATE bids SET status = 'rejected' WHERE project_id = ? AND id <> ?",
      [bid.project_id, bid.id]
    );
    await conn.query(
      'INSERT INTO assigned_projects (project_id, freelancer_id, bid_id) VALUES (?, ?, ?)',
      [bid.project_id, bid.freelancer_id, bid.id]
    );
    await conn.query("UPDATE projects SET status = 'assigned' WHERE id = ?", [bid.project_id]);

    await notify(bid.freelancer_id, `Your bid on "${bid.title}" was accepted!`, conn);

    // tell the other bidders
    const [others] = await conn.query(
      "SELECT freelancer_id FROM bids WHERE project_id = ? AND id <> ?",
      [bid.project_id, bid.id]
    );
    for (const o of others) {
      await notify(o.freelancer_id, `Your bid on "${bid.title}" was not selected`, conn);
    }

    await conn.commit();
    res.json({ message: 'Bid accepted and project assigned' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    conn.release();
  }
};