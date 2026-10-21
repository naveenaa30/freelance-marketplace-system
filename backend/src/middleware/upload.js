const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (req, file, cb) =>
    cb(null, crypto.randomBytes(12).toString('hex') + path.extname(file.originalname).toLowerCase())
});

const make = (allowed) =>
  multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowed.includes(ext)) cb(null, true);
      else cb(new Error(`Only ${allowed.join(', ')} files are allowed`));
    }
  });

// turns multer errors into clean 400 responses
const run = (mw) => (req, res, next) =>
  mw(req, res, (err) => {
    if (!err) return next();
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'File must be under 5 MB' : err.message;
    res.status(400).json({ message });
  });

exports.resumeUpload = run(make(['.pdf']).single('resume'));
exports.portfolioUpload = run(make(['.pdf', '.png', '.jpg', '.jpeg']).single('file'));