const router = require('express').Router();
const {
  createReport, getUsers, setUserStatus, getProjects,
  getReports, updateReport, getAnalytics
} = require('../controllers/adminController');
const { protect, allowRoles } = require('../middleware/auth');

router.post('/reports', protect, allowRoles('client', 'freelancer'), createReport);

router.get('/admin/users', protect, allowRoles('admin'), getUsers);
router.put('/admin/users/:id/status', protect, allowRoles('admin'), setUserStatus);
router.get('/admin/projects', protect, allowRoles('admin'), getProjects);
router.get('/admin/reports', protect, allowRoles('admin'), getReports);
router.put('/admin/reports/:id', protect, allowRoles('admin'), updateReport);
router.get('/admin/analytics', protect, allowRoles('admin'), getAnalytics);

module.exports = router;