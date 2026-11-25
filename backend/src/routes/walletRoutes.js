const router = require('express').Router();
const {
  getWallet, topUp, fundProject, getProjectPayment
} = require('../controllers/walletController');
const { protect, allowRoles } = require('../middleware/auth');

router.get('/wallet', protect, allowRoles('client', 'freelancer'), getWallet);
router.post('/wallet/topup', protect, allowRoles('client'), topUp);
router.post('/projects/:id/fund', protect, allowRoles('client'), fundProject);
router.get('/projects/:id/payment', protect, allowRoles('client', 'freelancer'), getProjectPayment);

module.exports = router;