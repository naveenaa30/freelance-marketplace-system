const router = require('express').Router();
const { getContacts, getConversations, getMessages } = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

router.get('/contacts', protect, getContacts);
router.get('/conversations', protect, getConversations);   // before /:userId
router.get('/:userId', protect, getMessages);

module.exports = router;