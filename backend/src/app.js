const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const pool = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const projectRoutes = require('./routes/projectRoutes');
const bidRoutes = require('./routes/bidRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const recommendRoutes = require('./routes/recommendRoutes');
const messageRoutes = require('./routes/messageRoutes');
const lifecycleRoutes = require('./routes/lifecycleRoutes');
const adminRoutes = require('./routes/adminRoutes');
const portfolioRoutes = require('./routes/portfolioRoutes');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: 'Too many attempts, try again in 15 minutes' }
});
app.use('/api/auth/login', loginLimiter);

app.use('/api/auth', authRoutes);
app.use('/api', profileRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api', bidRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/recommendations', recommendRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api', lifecycleRoutes);
app.use('/api', adminRoutes);
app.use('/api/portfolio', portfolioRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Freelance Marketplace API is running' });
});

app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT COUNT(*) AS skills FROM skills');
    res.json({ status: 'ok', skillsInDb: rows[0].skills });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = app;