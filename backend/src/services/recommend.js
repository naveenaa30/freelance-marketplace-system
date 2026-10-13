const pool = require('../config/db');

// For a client: best freelancers for a project
exports.recommendFreelancers = async (projectId, limit = 5) => {
  const [required] = await pool.query(
    'SELECT skill_id FROM project_skills WHERE project_id = ?',
    [projectId]
  );
  const reqIds = required.map((r) => r.skill_id);
  if (!reqIds.length) return [];

  const [rows] = await pool.query(
    `SELECT u.id, u.name, fp.title, fp.avg_rating, fp.experience_years,
            fp.completed_projects, fp.hourly_rate,
            COUNT(fs.skill_id) AS matched
     FROM users u
     JOIN freelancer_profiles fp ON fp.user_id = u.id
     JOIN freelancer_skills fs ON fs.freelancer_id = u.id AND fs.skill_id IN (?)
     WHERE u.is_active = 1
     GROUP BY u.id, u.name, fp.title, fp.avg_rating, fp.experience_years,
              fp.completed_projects, fp.hourly_rate`,
    [reqIds]
  );

  return rows
    .map((f) => {
      const skillMatch = f.matched / reqIds.length;
      const ratingScore = Number(f.avg_rating) / 5;
      const experienceScore = Math.min(f.experience_years, 10) / 10;
      const completedScore = Math.min(f.completed_projects, 20) / 20;
      const score =
        0.5 * skillMatch + 0.25 * ratingScore + 0.15 * experienceScore + 0.1 * completedScore;
      return {
        ...f,
        matchPercent: Math.round(skillMatch * 100),
        score: Number(score.toFixed(3))
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

// For a freelancer: best open projects for their skills
exports.recommendProjects = async (freelancerId, limit = 10) => {
  const [mine] = await pool.query(
    'SELECT skill_id FROM freelancer_skills WHERE freelancer_id = ?',
    [freelancerId]
  );
  const myIds = mine.map((r) => r.skill_id);
  if (!myIds.length) return [];

  const [rows] = await pool.query(
    `SELECT p.id, p.title, p.description, p.budget, p.deadline, p.created_at,
            u.name AS client_name,
            (SELECT COUNT(*) FROM project_skills WHERE project_id = p.id) AS required_count,
            COUNT(ps.skill_id) AS matched
     FROM projects p
     JOIN users u ON u.id = p.client_id
     JOIN project_skills ps ON ps.project_id = p.id AND ps.skill_id IN (?)
     WHERE p.status = 'open'
       AND p.id NOT IN (SELECT project_id FROM bids WHERE freelancer_id = ?)
     GROUP BY p.id, p.title, p.description, p.budget, p.deadline, p.created_at, u.name`,
    [myIds, freelancerId]
  );

  return rows
    .map((p) => ({
      ...p,
      matchPercent: Math.round((p.matched / p.required_count) * 100)
    }))
    .sort((a, b) => b.matchPercent - a.matchPercent || b.budget - a.budget)
    .slice(0, limit);
};