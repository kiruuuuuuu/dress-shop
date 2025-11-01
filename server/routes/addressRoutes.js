const express = require('express');
const {
  getMyAddresses,
  getAddressById,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} = require('../controllers/addressController');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

router.get('/', getMyAddresses);
router.get('/:id', getAddressById);
router.post('/', addAddress);
router.put('/:id', updateAddress);
router.delete('/:id', deleteAddress);
router.put('/:id/default', setDefaultAddress);

module.exports = router;


