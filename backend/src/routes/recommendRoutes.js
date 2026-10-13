const router = require('express').Router();
const { forProject, forFreelancer } = require('../controllers/recommendController');
const { protect, allowRoles } = require('../middleware/auth');

router.get('/project/:id', protect, allowRoles('client'), forProject);
router.get('/projects', protect, allowRoles('freelancer'), forFreelancer);

module.exports = router;