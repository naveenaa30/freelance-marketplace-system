require('dotenv').config();
const pool = require('./src/config/db');

(async () => {
  const [projects] = await pool.query("SELECT id, budget FROM projects WHERE status <> 'open'");
  let added = 0;

  for (const p of projects) {
    // freelancers who have at least one of the project's skills
    const [people] = await pool.query(
      `SELECT DISTINCT fs.freelancer_id AS id
       FROM freelancer_skills fs
       JOIN project_skills ps ON ps.skill_id = fs.skill_id
       WHERE ps.project_id = ?`,
      [p.id]
    );
    for (const f of people) {
      const amount = Math.round(Number(p.budget) * (0.7 + Math.random() * 0.5));
      const days = 5 + Math.floor(Math.random() * 15);
      const [r] = await pool.query(
        `INSERT IGNORE INTO bids (project_id, freelancer_id, amount, delivery_days, proposal, status)
         VALUES (?, ?, ?, ?, 'Past bid (demo data)', 'rejected')`,
        [p.id, f.id, amount, days]
      );
      added += r.affectedRows;
    }
  }
  console.log('bids added:', added);
  process.exit(0);
})();