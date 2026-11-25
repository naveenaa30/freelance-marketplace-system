const pool = require('../config/db');
const { notify } = require('../services/notify');
const { getProjectAccess } = require('../services/projectAccess');

const money = (n) => Math.round(Number(n) * 100) / 100;

// GET /api/wallet
exports.getWallet = async (req, res) => {
  try {
    const id = req.user.id;
    const [[u]] = await pool.query('SELECT wallet_balance FROM users WHERE id = ?', [id]);
    const [transactions] = await pool.query(
      `SELECT t.id, t.type, t.amount, t.note, t.created_at, p.title AS project_title
       FROM wallet_transactions t
       LEFT JOIN projects p ON p.id = t.project_id
       WHERE t.user_id = ?
       ORDER BY t.id DESC
       LIMIT 30`,
      [id]
    );
    const [[held]] = await pool.query(
      `SELECT COALESCE(SUM(CASE WHEN payer_id = ? THEN amount END), 0) AS paying,
              COALESCE(SUM(CASE WHEN payee_id = ? THEN amount END), 0) AS incoming
       FROM payments
       WHERE status = 'held' AND (payer_id = ? OR payee_id = ?)`,
      [id, id, id, id]
    );
    res.json({
      balance: Number(u.wallet_balance),
      heldPaying: Number(held.paying),
      heldIncoming: Number(held.incoming),
      transactions
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/wallet/topup   body: { amount }   (client, simulated money)
exports.topUp = async (req, res) => {
  const amount = money(req.body.amount);
  if (!Number.isFinite(amount) || amount < 1 || amount > 100000) {
    return res.status(400).json({ message: 'Amount must be between 1 and 100000' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?', [amount, req.user.id]);
    await conn.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, note)
       VALUES (?, 'topup', ?, 'Simulated top-up')`,
      [req.user.id, amount]
    );
    const [[u]] = await conn.query('SELECT wallet_balance FROM users WHERE id = ?', [req.user.id]);
    await conn.commit();
    res.json({ message: 'Wallet topped up', balance: Number(u.wallet_balance) });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    conn.release();
  }
};

// POST /api/projects/:id/fund   (client owner): moves the agreed bid amount into escrow
exports.fundProject = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const access = await getProjectAccess(req.params.id, req.user.id);
    if (!access || !access.isClient) {
      return res.status(404).json({ message: 'Project not found' });
    }
    if (!['assigned', 'in_progress'].includes(access.project.status)) {
      return res.status(400).json({ message: 'Only an assigned project can be funded' });
    }

    await conn.beginTransaction();

    const [[deal]] = await conn.query(
      `SELECT ap.freelancer_id, b.amount
       FROM assigned_projects ap JOIN bids b ON b.id = ap.bid_id
       WHERE ap.project_id = ?`,
      [req.params.id]
    );
    if (!deal) {
      await conn.rollback();
      return res.status(400).json({ message: 'No accepted bid for this project' });
    }
    const amount = money(deal.amount);

    // lock the client's row so two clicks cannot spend the same money twice
    const [[client]] = await conn.query('SELECT wallet_balance FROM users WHERE id = ? FOR UPDATE', [req.user.id]);
    if (Number(client.wallet_balance) < amount) {
      await conn.rollback();
      return res.status(400).json({
        message: `Insufficient wallet balance. You need $${amount.toFixed(2)} but have $${Number(client.wallet_balance).toFixed(2)}`
      });
    }

    await conn.query('UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?', [amount, req.user.id]);
    await conn.query(
      "INSERT INTO payments (project_id, payer_id, payee_id, amount, status) VALUES (?, ?, ?, ?, 'held')",
      [req.params.id, req.user.id, deal.freelancer_id, amount]
    );
    await conn.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, project_id, note)
       VALUES (?, 'escrow_hold', ?, ?, 'Funds held in escrow')`,
      [req.user.id, -amount, req.params.id]
    );

    await conn.commit();

    await notify(
      deal.freelancer_id,
      `$${amount.toFixed(2)} for "${access.project.title}" is now held in escrow`,
      pool,
      { subject: 'Payment secured in escrow' }
    );
    res.status(201).json({ message: 'Project funded. Money is held in escrow', amount });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'This project is already funded' });
    }
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    conn.release();
  }
};

// GET /api/projects/:id/payment   (client owner or assigned freelancer)
exports.getProjectPayment = async (req, res) => {
  try {
    const access = await getProjectAccess(req.params.id, req.user.id);
    if (!access) return res.status(404).json({ message: 'Project not found' });

    const [[deal]] = await pool.query(
      `SELECT b.amount FROM assigned_projects ap
       JOIN bids b ON b.id = ap.bid_id WHERE ap.project_id = ?`,
      [req.params.id]
    );
    const [[payment]] = await pool.query(
      'SELECT status, amount, released_at FROM payments WHERE project_id = ?',
      [req.params.id]
    );
    res.json({
      agreedAmount: deal ? Number(deal.amount) : null,
      payment: payment ? { ...payment, amount: Number(payment.amount) } : null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};