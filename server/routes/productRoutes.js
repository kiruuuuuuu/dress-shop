const express = require('express');
const { body } = require('express-validator');
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');
const { isAuthenticated, isAuthorized } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const productValidation = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('description').optional().trim(),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('stock_quantity').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
];

// Public routes
router.get('/', getAllProducts);
router.get('/:id', getProductById);

// Protected routes (Admin, Manager)
router.post(
  '/',
  isAuthenticated,
  isAuthorized(['admin', 'manager']),
  productValidation,
  createProduct
);

router.put(
  '/:id',
  isAuthenticated,
  isAuthorized(['admin', 'manager']),
  updateProduct
);

router.delete(
  '/:id',
  isAuthenticated,
  isAuthorized(['admin', 'manager']),
  deleteProduct
);

module.exports = router;





