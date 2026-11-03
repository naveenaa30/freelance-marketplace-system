const pool = require('../config/db');
const { similarities } = require('./tfidf');

// weights (they add up to 1.0)
const W = { skill: 0.4, text: 0.25, rating: 0.15, experience: 0.1, completed: 0.1 };

// For a client: best freelancers for a project
exports.recommendFreelancers = async (projectId, limit = 5) => {
  const [[project]] = await pool.query(
    'SELECT title, description FROM projects WHERE id = ?',
    [projectId]
  );
  if (!project) return [];

  const [required] = await pool.query(
    `SELECT s.id, s.name FROM project_skills ps
     JOIN skills s ON s.id = ps.skill_id WHERE ps.project_id = ?`,
    [projectId]
  );
  if (!required.length) return [];
  const reqIds = required.map((r) => r.id);

  const [rows] = await pool.query(
    `SELECT u.id, u.name, fp.title, fp.bio, fp.avg_rating, fp.experience_years,
            fp.completed_projects, fp.hourly_rate,
            (SELECT COUNT(*) FROM freelancer_skills fs
              WHERE fs.freelancer_id = u.id AND fs.skill_id IN (?)) AS matched,
            (SELECT GROUP_CONCAT(s.name SEPARATOR ' ') FROM freelancer_skills fs
              JOIN skills s ON s.id = fs.skill_id WHERE fs.freelancer_id = u.id) AS skill_text
     FROM users u
     JOIN freelancer_profiles fp ON fp.user_id = u.id
     WHERE u.is_active = 1
     HAVING matched > 0`,
    [reqIds]
  );
  if (!rows.length) return [];

  // text of the project vs text of each freelancer
  const projectText = `${project.title} ${project.description || ''} ${required.map((r) => r.name).join(' ')}`;
  const freelancerTexts = rows.map((f) => `${f.title || ''} ${f.bio || ''} ${f.skill_text || ''}`);
  const textSims = similarities(projectText, freelancerTexts);

  return rows
    .map((f, i) => {
      const skillMatch = f.matched / reqIds.length;
      const ratingScore = Number(f.avg_rating) / 5;
      const experienceScore = Math.min(f.experience_years, 10) / 10;
      const completedScore = Math.min(f.completed_projects, 20) / 20;
      const textScore = textSims[i];

      // the old rule-based formula, kept so we can compare the two
      const ruleScore =
        0.5 * skillMatch + 0.25 * ratingScore + 0.15 * experienceScore + 0.1 * completedScore;
      const score =
        W.skill * skillMatch + W.text * textScore + W.rating * ratingScore +
        W.experience * experienceScore + W.completed * completedScore;

      return {
        id: f.id,
        name: f.name,
        title: f.title,
        avg_rating: f.avg_rating,
        experience_years: f.experience_years,
        completed_projects: f.completed_projects,
        hourly_rate: f.hourly_rate,
        matched: f.matched,
        matchPercent: Math.round(skillMatch * 100),
        textPercent: Math.round(textScore * 100),
        ruleScore: Number(ruleScore.toFixed(3)),
        score: Number(score.toFixed(3))
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

// For a freelancer: best open projects for their skills and profile text
exports.recommendProjects = async (freelancerId, limit = 10) => {
  const [mine] = await pool.query(
    `SELECT s.id, s.name FROM freelancer_skills fs
     JOIN skills s ON s.id = fs.skill_id WHERE fs.freelancer_id = ?`,
    [freelancerId]
  );
  if (!mine.length) return [];
  const myIds = mine.map((r) => r.id);

  const [[profile]] = await pool.query(
    'SELECT title, bio FROM freelancer_profiles WHERE user_id = ?',
    [freelancerId]
  );

  const [rows] = await pool.query(
    `SELECT p.id, p.title, p.description, p.budget, p.deadline, p.created_at,
            u.name AS client_name,
            (SELECT COUNT(*) FROM project_skills WHERE project_id = p.id) AS required_count,
            (SELECT COUNT(*) FROM project_skills ps
              WHERE ps.project_id = p.id AND ps.skill_id IN (?)) AS matched,
            (SELECT GROUP_CONCAT(s.name SEPARATOR ' ') FROM project_skills ps
              JOIN skills s ON s.id = ps.skill_id WHERE ps.project_id = p.id) AS skill_text
     FROM projects p
     JOIN users u ON u.id = p.client_id
     WHERE p.status = 'open'
       AND p.id NOT IN (SELECT project_id FROM bids WHERE freelancer_id = ?)
     HAVING matched > 0`,
    [myIds, freelancerId]
  );
  if (!rows.length) return [];

  const myText = `${profile?.title || ''} ${profile?.bio || ''} ${mine.map((s) => s.name).join(' ')}`;
  const projectTexts = rows.map((p) => `${p.title} ${p.description || ''} ${p.skill_text || ''}`);
  const textSims = similarities(myText, projectTexts);

  return rows
    .map((p, i) => {
      const skillMatch = p.matched / p.required_count;
      return {
        id: p.id,
        title: p.title,
        description: p.description,
        budget: p.budget,
        deadline: p.deadline,
        client_name: p.client_name,
        matchPercent: Math.round(skillMatch * 100),
        textPercent: Math.round(textSims[i] * 100),
        score: Number((0.6 * skillMatch + 0.4 * textSims[i]).toFixed(3))
      };
    })
    .sort((a, b) => b.score - a.score || b.budget - a.budget)
    .slice(0, limit);
};