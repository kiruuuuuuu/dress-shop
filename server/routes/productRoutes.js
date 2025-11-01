const express = require('express');
const { body } = require('express-validator');
const {
  getAllProducts,
  getFeaturedProducts,
  getProductById,
  createProduct,
  updateProduct,
  toggleFeatured,
  deleteProduct,
} = require('../controllers/productController');
const { isAuthenticated, isAuthorized } = require('../middleware/auth');
const { withErrorHandling } = require('../middleware/upload');

const router = express.Router();

// Validation rules
const productValidation = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('description').optional().trim(),
  body('price').toFloat().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('stock_quantity').optional().toInt().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('return_days').optional().toInt().isInt({ min: 0, max: 365 }).withMessage('Return days must be between 0 and 365'),
];

// Public routes
router.get('/', getAllProducts);
router.get('/featured', getFeaturedProducts);
router.get('/:id', getProductById);

// Protected routes (Admin, Manager)
router.post(
  '/',
  isAuthenticated,
  isAuthorized(['admin', 'manager']),
  withErrorHandling('image'),
  productValidation,
  createProduct
);

router.put(
  '/:id',
  isAuthenticated,
  isAuthorized(['admin', 'manager']),
  withErrorHandling('image'),
  updateProduct
);

router.put(
  '/:id/featured',
  isAuthenticated,
  isAuthorized(['admin', 'manager']),
  toggleFeatured
);

router.delete(
  '/:id',
  isAuthenticated,
  isAuthorized(['admin', 'manager']),
  deleteProduct
);

module.exports = router;







