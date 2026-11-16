require('dotenv').config();
const pool = require('./src/config/db');

const items = [
  ['[Demo] Online bookstore website', 'Catalog, cart and checkout for a small bookstore', 450, ['React', 'Node.js', 'MySQL'], 30],
  ['[Demo] Restaurant ordering app UI', 'Mobile screens for a food ordering app', 200, ['UI/UX Design'], 20],
  ['[Demo] Student attendance portal', 'Web portal to track attendance with reports', 350, ['React', 'Node.js', 'MySQL'], 45],
  ['[Demo] Company logo and branding', 'Logo, colours and social media kit', 120, ['Graphic Design'], 15],
  ['[Demo] Sales data analysis', 'Clean sales data and build summary insights', 300, ['Python', 'Data Analysis'], 25],
  ['[Demo] Blog content writing', 'Ten SEO friendly blog articles', 150, ['Content Writing', 'SEO'], 18],
  ['[Demo] Android expense tracker', 'Simple expense tracking app', 400, ['Java', 'Android'], 40],
  ['[Demo] Churn prediction model', 'Machine learning model to predict customer churn', 700, ['Python', 'Machine Learning'], 60]
];

(async () => {
  const [[client]] = await pool.query("SELECT id FROM users WHERE email = 'client@test.com'");
  if (!client) { console.log('client@test.com not found'); process.exit(1); }

  for (const [title, description, budget, skills, days] of items) {
    const [exists] = await pool.query('SELECT id FROM projects WHERE title = ?', [title]);
    if (exists.length) { console.log('skip (exists):', title); continue; }

    const [r] = await pool.query(
      'INSERT INTO projects (client_id, title, description, budget, deadline) VALUES (?, ?, ?, ?, DATE_ADD(CURDATE(), INTERVAL ? DAY))',
      [client.id, title, description, budget, days]
    );
    for (const s of skills) {
      await pool.query(
        'INSERT INTO project_skills (project_id, skill_id) SELECT ?, id FROM skills WHERE name = ?',
        [r.insertId, s]
      );
    }
    console.log('added:', title);
  }
  process.exit(0);
})();