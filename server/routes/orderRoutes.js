const express = require('express');
const {
  getAllOrders,
  getOrderById,
  getMyOrders,
  updateOrderStatus,
  getOrderStats,
  getPendingApprovalOrders,
  updateOrderApproval,
  generateBill,
} = require('../controllers/orderController');
const { isAuthenticated, isAuthorized } = require('../middleware/auth');

const router = express.Router();

// All order routes require authentication
router.use(isAuthenticated);

// Customer routes
router.get('/my/list', getMyOrders);

// Admin/Manager routes
router.get('/stats/summary', isAuthorized(['admin', 'manager']), getOrderStats);
router.get('/pending-approval', isAuthorized(['admin', 'manager']), getPendingApprovalOrders);
router.get('/', isAuthorized(['admin', 'manager']), getAllOrders);

// Shared routes (customers can see their own orders, admins/managers can see any)
router.get('/:id', getOrderById);
router.get('/:id/bill', generateBill);

// Admin/Manager only routes
router.put('/:id/status', isAuthorized(['admin', 'manager']), updateOrderStatus);
router.put('/:id/approval', isAuthorized(['admin', 'manager']), updateOrderApproval);

module.exports = router;
