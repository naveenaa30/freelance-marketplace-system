require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./src/config/db');

const people = [
  ['Arjun Mehta', 'arjun@test.com', 'Full Stack Developer',
   'Builds REST APIs and dashboards with Node.js and React. Experienced in MySQL database design and authentication.',
   4, 4.2, 5, 30, ['React', 'Node.js', 'MySQL']],
  ['Priya Nair', 'priya@test.com', 'Frontend Developer',
   'Creates responsive React interfaces with clean component design and accessibility focus.',
   2, 4.6, 3, 22, ['React', 'UI/UX Design']],
  ['Rahul Verma', 'rahul@test.com', 'Backend Engineer',
   'Designs scalable server side APIs, database schemas and secure authentication using Node.js and MySQL.',
   7, 4.8, 12, 40, ['Node.js', 'MySQL']],
  ['Sneha Rao', 'sneha@test.com', 'UI/UX Designer',
   'Designs mobile and web interfaces in Figma with user research and clickable prototypes.',
   3, 4.4, 6, 25, ['UI/UX Design', 'Graphic Design']],
  ['Karthik S', 'karthik@test.com', 'Data Scientist',
   'Builds machine learning models and data analysis pipelines in Python.',
   5, 4.5, 9, 35, ['Python', 'Machine Learning', 'Data Analysis']],
  ['Divya K', 'divya@test.com', 'Android Developer',
   'Develops Android apps in Java with REST API integration.',
   3, 4.0, 4, 28, ['Java', 'Android']],
  ['Imran Shaikh', 'imran@test.com', 'Junior Web Developer',
   'Learning web development with React and Node.js, looking for first projects.',
   1, 0, 0, 10, ['React', 'Node.js']]
];

(async () => {
  const hash = await bcrypt.hash('123456', 10);
  for (const [name, email, title, bio, exp, rating, done, rate, skills] of people) {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) { console.log('skip (exists):', email); continue; }

    const [r] = await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'freelancer')",
      [name, email, hash]
    );
    await pool.query(
      `INSERT INTO freelancer_profiles
        (user_id, title, bio, experience_years, hourly_rate, avg_rating, completed_projects)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [r.insertId, title, bio, exp, rate, rating, done]
    );
    for (const s of skills) {
      await pool.query(
        'INSERT INTO freelancer_skills (freelancer_id, skill_id) SELECT ?, id FROM skills WHERE name = ?',
        [r.insertId, s]
      );
    }
    console.log('added:', name);
  }
  process.exit(0);
})();