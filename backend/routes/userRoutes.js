const express = require('express');
const router = express.Router();
const { getUserProfile, updateUserProfile } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

// All user profile routes require authentication
router.use(protect);

router.route('/profile')
  .get(getUserProfile)
  .put(updateUserProfile);

module.exports = router;
