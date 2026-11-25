const pool = require('../config/db');

// moves held money to the freelancer. Safe to call when nothing is held: it returns null.
exports.releasePayment = async (projectId) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      "SELECT id, payee_id, amount FROM payments WHERE project_id = ? AND status = 'held' FOR UPDATE",
      [projectId]
    );
    if (!rows.length) {
      await conn.rollback();
      return null;
    }
    const pay = rows[0];

    await conn.query('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?', [pay.amount, pay.payee_id]);
    await conn.query("UPDATE payments SET status = 'released', released_at = NOW() WHERE id = ?", [pay.id]);
    await conn.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, project_id, note)
       VALUES (?, 'escrow_release', ?, ?, 'Payment released after project completion')`,
      [pay.payee_id, pay.amount, projectId]
    );

    await conn.commit();
    return { amount: Number(pay.amount), payeeId: pay.payee_id };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};