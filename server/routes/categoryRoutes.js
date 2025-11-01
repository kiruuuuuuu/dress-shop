const express = require('express');
const { body } = require('express-validator');
const {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const { isAuthenticated, isAuthorized } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const categoryValidation = [
  body('name').trim().notEmpty().withMessage('Category name is required'),
  body('slug').trim().notEmpty().withMessage('Category slug is required')
    .matches(/^[a-z0-9-]+$/).withMessage('Slug must be lowercase with hyphens'),
  body('description').optional().trim(),
];

// Public routes
router.get('/', getAllCategories);
router.get('/:id', getCategoryById);

// Protected routes (Admin, Manager)
router.post(
  '/',
  isAuthenticated,
  isAuthorized(['admin', 'manager']),
  categoryValidation,
  createCategory
);

router.put(
  '/:id',
  isAuthenticated,
  isAuthorized(['admin', 'manager']),
  updateCategory
);

router.delete(
  '/:id',
  isAuthenticated,
  isAuthorized(['admin', 'manager']),
  deleteCategory
);

module.exports = router;







