const pool = require('../config/db');

// returns { project, isClient, isFreelancer, freelancerId } or null
exports.getProjectAccess = async (projectId, userId) => {
  const [rows] = await pool.query(
    `SELECT p.id, p.title, p.status, p.progress, p.client_id,
            ap.freelancer_id
     FROM projects p
     LEFT JOIN assigned_projects ap ON ap.project_id = p.id
     WHERE p.id = ?`,
    [projectId]
  );
  if (!rows.length) return null;
  const p = rows[0];
  const isClient = p.client_id === userId;
  const isFreelancer = p.freelancer_id === userId;
  if (!isClient && !isFreelancer) return null;
  return { project: p, isClient, isFreelancer, freelancerId: p.freelancer_id };
};