const express = require('express');
const {
  createReturnRequest,
  getReturnRequests,
  getReturnRequestById,
  updateReturnStatus,
  checkReturnEligibility,
} = require('../controllers/returnController');
const { isAuthenticated, isAuthorized } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

// Customer routes
router.post('/', createReturnRequest);
router.get('/check/:orderId/:orderItemId', checkReturnEligibility);

// Customer and Admin routes (with filtering based on role)
router.get('/', getReturnRequests);
router.get('/:id', getReturnRequestById);

// Admin/Manager only routes
router.put(
  '/:id/status',
  isAuthorized(['admin', 'manager']),
  updateReturnStatus
);

module.exports = router;

