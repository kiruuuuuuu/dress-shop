const express = require('express');
const {
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  updateProfile,
} = require('../controllers/userController');
const { isAuthenticated, isAuthorized } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

// Customer route (update own profile)
router.put('/profile', updateProfile);

// Admin-only routes
router.get('/', isAuthorized(['admin']), getAllUsers);
router.get('/:id', isAuthorized(['admin']), getUserById);
router.put('/:id/role', isAuthorized(['admin']), updateUserRole);
router.delete('/:id', isAuthorized(['admin']), deleteUser);

module.exports = router;





