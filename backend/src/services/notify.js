const pool = require('../config/db');
const { getIO } = require('../sockets/io');

// conn is optional: pass a transaction connection to keep it inside the transaction
exports.notify = async (userId, message, conn = pool) => {
  await conn.query(
    'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
    [userId, message]
  );
  const io = getIO();
  if (io) {
    io.to(`user_${userId}`).emit('notification', { message, created_at: new Date() });
  }
};