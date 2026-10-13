const router = require('express').Router();
const {
  addMilestone, getMilestones, updateMilestone, completeProject
} = require('../controllers/milestoneController');
const { createReview, getUserReviews } = require('../controllers/reviewController');
const { protect, allowRoles } = require('../middleware/auth');

router.post('/projects/:id/milestones', protect, allowRoles('client'), addMilestone);
router.get('/projects/:id/milestones', protect, getMilestones);
router.put('/milestones/:id', protect, allowRoles('freelancer'), updateMilestone);
router.post('/projects/:id/complete', protect, allowRoles('client'), completeProject);

router.post('/reviews', protect, allowRoles('client', 'freelancer'), createReview);
router.get('/reviews/user/:id', protect, getUserReviews);

module.exports = router;