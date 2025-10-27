const express = require('express');
const {
  createTicket,
  getTickets,
  getTicketById,
  addTicketResponse,
  updateTicketStatus,
  getTicketStats,
} = require('../controllers/supportController');
const { isAuthenticated, isAuthorized } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

// Customer and Admin routes
router.post('/tickets', createTicket);
router.get('/tickets', getTickets);
router.get('/tickets/:id', getTicketById);
router.post('/tickets/:id/responses', addTicketResponse);

// Admin/Manager only routes
router.put(
  '/tickets/:id/status',
  isAuthorized(['admin', 'manager']),
  updateTicketStatus
);

router.get(
  '/stats',
  isAuthorized(['admin', 'manager']),
  getTicketStats
);

module.exports = router;

