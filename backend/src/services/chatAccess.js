const pool = require('../config/db');

// true if a client and freelancer share a project (a bid exists between them)
exports.canChat = async (userA, userB) => {
  const [rows] = await pool.query(
    `SELECT 1
     FROM bids b JOIN projects p ON p.id = b.project_id
     WHERE (p.client_id = ? AND b.freelancer_id = ?)
        OR (p.client_id = ? AND b.freelancer_id = ?)
     LIMIT 1`,
    [userA, userB, userB, userA]
  );
  return rows.length > 0;
};