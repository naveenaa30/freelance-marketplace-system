const router = require('express').Router();
const {
  submitBid, getProjectBids, getMyBids, acceptBid, getBidSuggestion
} = require('../controllers/bidController');
const { protect, allowRoles } = require('../middleware/auth');

router.post('/projects/:id/bids', protect, allowRoles('freelancer'), submitBid);
router.get('/projects/:id/bids', protect, allowRoles('client'), getProjectBids);
router.get('/projects/:id/bid-suggestion', protect, allowRoles('freelancer'), getBidSuggestion);
router.get('/bids/my', protect, allowRoles('freelancer'), getMyBids);
router.post('/bids/:id/accept', protect, allowRoles('client'), acceptBid);

module.exports = router;