const express = require('express');
const { createOrder, verifyPayment } = require('../controllers/checkoutController');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

// All checkout routes require authentication
router.use(isAuthenticated);

router.post('/create-order', createOrder);
router.post('/verify-payment', verifyPayment);

module.exports = router;







