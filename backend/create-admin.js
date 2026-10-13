require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./src/config/db');

(async () => {
  const email = 'admin@test.com';
  const hash = await bcrypt.hash('admin123', 10);
  await pool.query(
    "INSERT INTO users (name, email, password, role) VALUES ('Admin', ?, ?, 'admin') ON DUPLICATE KEY UPDATE password = VALUES(password)",
    [email, hash]
  );
  console.log('Admin ready:', email, '/ admin123');
  process.exit(0);
})();