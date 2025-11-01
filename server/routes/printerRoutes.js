const express = require('express');
const {
  getPrinters,
  addPrinter,
  updatePrinter,
  deletePrinter,
  setDefaultPrinter,
  getAvailablePrinters,
  getPrintHistory,
  retryPrint,
} = require('../controllers/printerController');
const { isAuthenticated, isAuthorized } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

router.get('/', getPrinters);
router.post('/', addPrinter);
router.put('/:id', updatePrinter);
router.delete('/:id', deletePrinter);
router.put('/:id/default', setDefaultPrinter);
router.get('/available', getAvailablePrinters);
router.get('/history/:orderId', getPrintHistory);
router.post('/retry/:orderId', isAuthorized(['admin', 'manager']), retryPrint);

module.exports = router;
