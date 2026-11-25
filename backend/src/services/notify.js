const pool = require('../config/db');
const { getIO } = require('../sockets/io');
const { sendToUser } = require('./mailer');

// conn is optional: pass a transaction connection to keep the insert inside the transaction.
// opts.subject sets the email subject; opts.email = false turns the email off.
exports.notify = async (userId, message, conn = pool, opts = {}) => {
  await conn.query(
    'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
    [userId, message]
  );

  const io = getIO();
  if (io) {
    io.to(`user_${userId}`).emit('notification', { message, created_at: new Date() });
  }

  // calls made inside a transaction are emailed after the commit (see acceptBid)
  if (conn === pool && opts.email !== false) {
    sendToUser(userId, opts.subject || 'New notification', message).catch(() => {});
  }
};