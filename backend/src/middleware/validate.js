const { body, validationResult } = require('express-validator');

// returns the first validation error as a clean 400 response
const check = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }
  next();
};

exports.registerRules = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2 to 100 characters'),
  body('email').trim().isEmail().withMessage('Enter a valid email address'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['client', 'freelancer']).withMessage('Role must be client or freelancer'),
  check
];

exports.projectRules = [
  body('title').trim().isLength({ min: 3, max: 200 }).withMessage('Title must be 3 to 200 characters'),
  body('budget').isFloat({ gt: 0 }).withMessage('Budget must be a number greater than 0'),
  body('deadline').optional({ checkFalsy: true }).isISO8601().withMessage('Deadline must be a valid date'),
  check
];

exports.passwordRules = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  check
];