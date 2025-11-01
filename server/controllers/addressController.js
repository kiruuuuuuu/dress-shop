const pool = require('../config/database');

// @desc    Get all addresses for logged in user
// @route   GET /api/addresses
// @access  Private
const getMyAddresses = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT * FROM user_addresses 
       WHERE user_id = $1 
       ORDER BY is_default DESC, created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      addresses: result.rows,
    });

  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching addresses.',
    });
  }
};

// @desc    Get single address by ID
// @route   GET /api/addresses/:id
// @access  Private
const getAddressById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT * FROM user_addresses 
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Address not found.',
      });
    }

    res.json({
      success: true,
      address: result.rows[0],
    });

  } catch (error) {
    console.error('Get address error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching address.',
    });
  }
};

// @desc    Add new address
// @route   POST /api/addresses
// @access  Private
const addAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      address_type = 'home',
      full_name,
      mobile_number,
      house_number,
      address_line1,
      address_line2,
      city,
      state,
      pincode,
      country = 'India',
      is_default = false,
    } = req.body;

    // Validation
    if (!full_name || !mobile_number || !address_line1 || !city || !state || !pincode) {
      return res.status(400).json({
        success: false,
        message: 'Full name, mobile number, address line 1, city, state, and pincode are required.',
      });
    }

    // Validate mobile number (10 digits)
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobile_number)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid mobile number. Must be 10 digits starting with 6-9.',
      });
    }

    // Validate pincode (6 digits)
    const pincodeRegex = /^\d{6}$/;
    if (!pincodeRegex.test(pincode)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pincode. Must be 6 digits.',
      });
    }

    // If this is set as default, unset other defaults
    if (is_default) {
      await pool.query(
        'UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1',
        [userId]
      );
    }

    const result = await pool.query(
      `INSERT INTO user_addresses 
       (user_id, address_type, full_name, mobile_number, house_number, address_line1, address_line2, city, state, pincode, country, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [userId, address_type, full_name, mobile_number, house_number || null, address_line1, address_line2 || null, city, state, pincode, country, is_default]
    );

    res.status(201).json({
      success: true,
      message: 'Address added successfully.',
      address: result.rows[0],
    });

  } catch (error) {
    console.error('Add address error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding address.',
    });
  }
};

// @desc    Update address
// @route   PUT /api/addresses/:id
// @access  Private
const updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      address_type,
      full_name,
      mobile_number,
      house_number,
      address_line1,
      address_line2,
      city,
      state,
      pincode,
      country,
      is_default,
    } = req.body;

    // Check if address exists and belongs to user
    const checkResult = await pool.query(
      'SELECT * FROM user_addresses WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Address not found.',
      });
    }

    // Validate mobile number if provided
    if (mobile_number) {
      const mobileRegex = /^[6-9]\d{9}$/;
      if (!mobileRegex.test(mobile_number)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid mobile number. Must be 10 digits starting with 6-9.',
        });
      }
    }

    // Validate pincode if provided
    if (pincode) {
      const pincodeRegex = /^\d{6}$/;
      if (!pincodeRegex.test(pincode)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid pincode. Must be 6 digits.',
        });
      }
    }

    // If this is set as default, unset other defaults
    if (is_default === true) {
      await pool.query(
        'UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1 AND id != $2',
        [userId, id]
      );
    }

    const result = await pool.query(
      `UPDATE user_addresses 
       SET address_type = COALESCE($1, address_type),
           full_name = COALESCE($2, full_name),
           mobile_number = COALESCE($3, mobile_number),
           house_number = COALESCE($4, house_number),
           address_line1 = COALESCE($5, address_line1),
           address_line2 = COALESCE($6, address_line2),
           city = COALESCE($7, city),
           state = COALESCE($8, state),
           pincode = COALESCE($9, pincode),
           country = COALESCE($10, country),
           is_default = COALESCE($11, is_default),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $12 AND user_id = $13
       RETURNING *`,
      [address_type, full_name, mobile_number, house_number, address_line1, address_line2, city, state, pincode, country, is_default, id, userId]
    );

    res.json({
      success: true,
      message: 'Address updated successfully.',
      address: result.rows[0],
    });

  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating address.',
    });
  }
};

// @desc    Delete address
// @route   DELETE /api/addresses/:id
// @access  Private
const deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      'DELETE FROM user_addresses WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Address not found.',
      });
    }

    res.json({
      success: true,
      message: 'Address deleted successfully.',
    });

  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting address.',
    });
  }
};

// @desc    Set default address
// @route   PUT /api/addresses/:id/default
// @access  Private
const setDefaultAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if address exists and belongs to user
    const checkResult = await pool.query(
      'SELECT * FROM user_addresses WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Address not found.',
      });
    }

    // Unset all other defaults
    await pool.query(
      'UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1',
      [userId]
    );

    // Set this as default
    const result = await pool.query(
      'UPDATE user_addresses SET is_default = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    res.json({
      success: true,
      message: 'Default address updated successfully.',
      address: result.rows[0],
    });

  } catch (error) {
    console.error('Set default address error:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting default address.',
    });
  }
};

module.exports = {
  getMyAddresses,
  getAddressById,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};

