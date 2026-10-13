const pool = require('../config/db');

// GET /api/messages/contacts : people I can chat with
exports.getContacts = async (req, res) => {
  try {
    const me = req.user.id;
    const [rows] = await pool.query(
      `SELECT DISTINCT u.id, u.name, u.role
       FROM bids b
       JOIN projects p ON p.id = b.project_id
       JOIN users u ON u.id = IF(p.client_id = ?, b.freelancer_id, p.client_id)
       WHERE p.client_id = ? OR b.freelancer_id = ?`,
      [me, me, me]
    );
    res.json({ contacts: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/messages/conversations : people I've chatted with
exports.getConversations = async (req, res) => {
  try {
    const me = req.user.id;
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.role,
              m.content AS last_message, m.created_at AS last_at,
              (SELECT COUNT(*) FROM messages x
               WHERE x.sender_id = u.id AND x.receiver_id = ? AND x.is_read = 0) AS unread
       FROM users u
       JOIN messages m ON m.id = (
         SELECT MAX(id) FROM messages
         WHERE (sender_id = ? AND receiver_id = u.id)
            OR (sender_id = u.id AND receiver_id = ?)
       )
       ORDER BY m.id DESC`,
      [me, me, me]
    );
    res.json({ conversations: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/messages/:userId : history with one person (also marks theirs as read)
exports.getMessages = async (req, res) => {
  try {
    const me = req.user.id;
    const other = Number(req.params.userId);
    if (!other) return res.status(400).json({ message: 'Invalid user id' });

    const [rows] = await pool.query(
      `SELECT id, sender_id, receiver_id, project_id, content, is_read, created_at
       FROM messages
       WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
       ORDER BY id ASC
       LIMIT 200`,
      [me, other, other, me]
    );

    await pool.query(
      'UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ?',
      [other, me]
    );
    res.json({ messages: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};