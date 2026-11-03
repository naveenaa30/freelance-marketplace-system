const router = require('express').Router();
const { register, login, me, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { registerRules, passwordRules } = require('../middleware/validate');

router.post('/register', registerRules, register);
router.post('/login', login);
router.get('/me', protect, me);
router.put('/password', protect, passwordRules, changePassword);

module.exports = router;