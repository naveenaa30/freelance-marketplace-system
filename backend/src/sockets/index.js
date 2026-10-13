const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { setIO } = require('./io');
const { canChat } = require('../services/chatAccess');

module.exports = (server) => {
  const io = new Server(server, {
    cors: { origin: 'http://localhost:5173' }
  });
  setIO(io);

  // reject connections without a valid token
  io.use((socket, next) => {
    try {
      socket.user = jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    // personal room: lets us push to a user on any of their open tabs
    socket.join(`user_${socket.user.id}`);

    socket.on('send_message', async (data, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      try {
        const receiverId = Number(data?.receiverId);
        const content = String(data?.content || '').trim();
        const projectId = data?.projectId ? Number(data.projectId) : null;

        if (!receiverId || receiverId === socket.user.id) {
          return reply({ ok: false, error: 'Invalid receiver' });
        }
        if (!content || content.length > 2000) {
          return reply({ ok: false, error: 'Message must be 1 to 2000 characters' });
        }
        if (!(await canChat(socket.user.id, receiverId))) {
          return reply({ ok: false, error: 'You can only chat with users you share a project with' });
        }

        const [result] = await pool.query(
          'INSERT INTO messages (sender_id, receiver_id, project_id, content) VALUES (?, ?, ?, ?)',
          [socket.user.id, receiverId, projectId, content]
        );
        const [[sender]] = await pool.query('SELECT name FROM users WHERE id = ?', [socket.user.id]);

        const message = {
          id: result.insertId,
          sender_id: socket.user.id,
          sender_name: sender.name,
          receiver_id: receiverId,
          project_id: projectId,
          content,
          created_at: new Date()
        };

        io.to(`user_${receiverId}`).emit('new_message', message);
        reply({ ok: true, message });
      } catch (err) {
        console.error(err);
        reply({ ok: false, error: 'Server error' });
      }
    });
  });

  return io;
};