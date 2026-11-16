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

// GET /api/projects/:id/bids   (project owner only) - each bid gets a score
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
    if (!bids.length) return res.json({ bids: [] });

    // min-max normalisation: cheapest / fastest bid gets 1, most expensive / slowest gets 0
    const amounts = bids.map((b) => Number(b.amount));
    const days = bids.map((b) => Number(b.delivery_days));
    const minA = Math.min(...amounts), maxA = Math.max(...amounts);
    const minD = Math.min(...days), maxD = Math.max(...days);
    const lowerIsBetter = (v, lo, hi) => (hi === lo ? 1 : (hi - v) / (hi - lo));

    const scored = bids.map((b) => {
      const priceScore = lowerIsBetter(Number(b.amount), minA, maxA);
      const speedScore = lowerIsBetter(Number(b.delivery_days), minD, maxD);
      const ratingScore = Number(b.avg_rating || 0) / 5;
      const score = 0.4 * priceScore + 0.35 * ratingScore + 0.25 * speedScore;
      return { ...b, score: Number(score.toFixed(3)) };
    });

    res.json({ bids: scored });
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
      'SELECT freelancer_id FROM bids WHERE project_id = ? AND id <> ?',
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

const median = (list) => {
  const s = [...list].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// GET /api/projects/:id/bid-suggestion   (freelancer)
// market prices: bids on OTHER projects that share at least one skill with this one
exports.getBidSuggestion = async (req, res) => {
  try {
    const [[project]] = await pool.query('SELECT budget FROM projects WHERE id = ?', [req.params.id]);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const [rows] = await pool.query(
      `SELECT DISTINCT b.id, b.amount
       FROM bids b
       JOIN project_skills ps ON ps.project_id = b.project_id
       WHERE b.project_id <> ?
         AND ps.skill_id IN (SELECT skill_id FROM project_skills WHERE project_id = ?)`,
      [req.params.id, req.params.id]
    );

    const amounts = rows.map((r) => Number(r.amount));
    const round = (n) => Math.round(n * 100) / 100;
    const base = { budget: Number(project.budget), count: amounts.length, enough: amounts.length >= 3 };

    if (!amounts.length) return res.json(base);
    res.json({
      ...base,
      average: round(amounts.reduce((s, v) => s + v, 0) / amounts.length),
      median: round(median(amounts)),
      min: Math.min(...amounts),
      max: Math.max(...amounts)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};