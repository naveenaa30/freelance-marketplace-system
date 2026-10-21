const router = require('express').Router();
const {
  uploadResume, addItem, getMine, getForFreelancer, deleteItem
} = require('../controllers/portfolioController');
const { resumeUpload, portfolioUpload } = require('../middleware/upload');
const { protect, allowRoles } = require('../middleware/auth');

router.post('/resume', protect, allowRoles('freelancer'), resumeUpload, uploadResume);
router.post('/', protect, allowRoles('freelancer'), portfolioUpload, addItem);
router.get('/my', protect, allowRoles('freelancer'), getMine);
router.get('/freelancer/:id', protect, getForFreelancer);
router.delete('/:id', protect, allowRoles('freelancer'), deleteItem);

module.exports = router;