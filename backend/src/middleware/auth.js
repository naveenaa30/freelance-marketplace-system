const jwt = require('jsonwebtoken');
const pool = require('../config/db');

exports.protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await pool.query('SELECT role, is_active FROM users WHERE id = ?', [payload.id]);
    if (!rows.length) return res.status(401).json({ message: 'Invalid or expired token' });
    if (!rows[0].is_active) return res.status(403).json({ message: 'Account is blocked' });
    req.user = { id: payload.id, role: rows[0].role };
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

exports.allowRoles = (...roles) => (req, res, next) =>
  roles.includes(req.user.role)
    ? next()
    : res.status(403).json({ message: 'Forbidden' });