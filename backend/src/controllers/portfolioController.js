const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

// webPath looks like /uploads/abc123.pdf
const removeFile = (webPath) => {
  if (!webPath) return;
  fs.unlink(path.join(__dirname, '../../', webPath), () => {});
};

// POST /api/portfolio/resume   (form-data: resume)
exports.uploadResume = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Please choose a PDF file' });
  const newPath = `/uploads/${req.file.filename}`;
  try {
    const [rows] = await pool.query(
      'SELECT resume_path FROM freelancer_profiles WHERE user_id = ?', [req.user.id]
    );
    await pool.query(
      'UPDATE freelancer_profiles SET resume_path = ? WHERE user_id = ?', [newPath, req.user.id]
    );
    removeFile(rows[0]?.resume_path);
    res.json({ message: 'Resume uploaded', resume: newPath });
  } catch (err) {
    removeFile(newPath);
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/portfolio   (form-data: title, description, file)
exports.addItem = async (req, res) => {
  const { title, description } = req.body;
  if (!req.file) return res.status(400).json({ message: 'Please choose a file' });
  const filePath = `/uploads/${req.file.filename}`;
  if (!title || !title.trim()) {
    removeFile(filePath);
    return res.status(400).json({ message: 'Title is required' });
  }
  try {
    await pool.query(
      'INSERT INTO portfolios (freelancer_id, title, description, file_path) VALUES (?, ?, ?, ?)',
      [req.user.id, title.trim(), description || null, filePath]
    );
    res.status(201).json({ message: 'Portfolio item added' });
  } catch (err) {
    removeFile(filePath);
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const loadPortfolio = async (freelancerId) => {
  const [[profile]] = await pool.query(
    'SELECT resume_path FROM freelancer_profiles WHERE user_id = ?', [freelancerId]
  );
  const [items] = await pool.query(
    'SELECT id, title, description, file_path FROM portfolios WHERE freelancer_id = ? ORDER BY id DESC',
    [freelancerId]
  );
  return { resume: profile?.resume_path || null, items };
};

// GET /api/portfolio/my
exports.getMine = async (req, res) => {
  try {
    res.json(await loadPortfolio(req.user.id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/portfolio/freelancer/:id   (public to logged-in users)
exports.getForFreelancer = async (req, res) => {
  try {
    res.json(await loadPortfolio(req.params.id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/portfolio/:id   (owner only)
exports.deleteItem = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT file_path FROM portfolios WHERE id = ? AND freelancer_id = ?',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Item not found' });
    await pool.query('DELETE FROM portfolios WHERE id = ? AND freelancer_id = ?', [req.params.id, req.user.id]);
    removeFile(rows[0].file_path);
    res.json({ message: 'Item deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};