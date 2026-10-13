const router = require('express').Router();
const {
  createProject, getProjects, getMyProjects, getProject, updateProject, deleteProject
} = require('../controllers/projectController');
const { protect, allowRoles } = require('../middleware/auth');

router.post('/', protect, allowRoles('client'), createProject);
router.get('/', protect, getProjects);
router.get('/my', protect, allowRoles('client'), getMyProjects);   // must be before /:id
router.get('/:id', protect, getProject);
router.put('/:id', protect, allowRoles('client'), updateProject);
router.delete('/:id', protect, allowRoles('client'), deleteProject);

module.exports = router;