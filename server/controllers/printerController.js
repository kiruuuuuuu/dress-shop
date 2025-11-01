const pool = require('../config/database');

// @desc    Get user's printers
// @route   GET /api/printers
// @access  Private
const getPrinters = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      'SELECT * FROM printer_settings WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
      [userId]
    );

    res.json({
      success: true,
      printers: result.rows,
    });

  } catch (error) {
    console.error('Get printers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching printers.',
    });
  }
};

// @desc    Add new printer
// @route   POST /api/printers
// @access  Private
const addPrinter = async (req, res) => {
  try {
    const userId = req.user.id;
    const { printer_name, printer_ip, connection_type } = req.body;

    if (!printer_name) {
      return res.status(400).json({
        success: false,
        message: 'Printer name is required.',
      });
    }

    const result = await pool.query(
      `INSERT INTO printer_settings (user_id, printer_name, printer_ip, connection_type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, printer_name, printer_ip || null, connection_type || 'wifi']
    );

    res.status(201).json({
      success: true,
      message: 'Printer added successfully.',
      printer: result.rows[0],
    });

  } catch (error) {
    console.error('Add printer error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding printer.',
    });
  }
};

// @desc    Update printer
// @route   PUT /api/printers/:id
// @access  Private
const updatePrinter = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { printer_name, printer_ip, connection_type } = req.body;

    // Check ownership
    const existing = await pool.query(
      'SELECT id FROM printer_settings WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Printer not found.',
      });
    }

    const result = await pool.query(
      `UPDATE printer_settings
       SET printer_name = COALESCE($1, printer_name),
           printer_ip = COALESCE($2, printer_ip),
           connection_type = COALESCE($3, connection_type)
       WHERE id = $4
       RETURNING *`,
      [printer_name, printer_ip, connection_type, id]
    );

    res.json({
      success: true,
      message: 'Printer updated successfully.',
      printer: result.rows[0],
    });

  } catch (error) {
    console.error('Update printer error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating printer.',
    });
  }
};

// @desc    Delete printer
// @route   DELETE /api/printers/:id
// @access  Private
const deletePrinter = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check ownership
    const existing = await pool.query(
      'SELECT id FROM printer_settings WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Printer not found.',
      });
    }

    await pool.query('DELETE FROM printer_settings WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Printer deleted successfully.',
    });

  } catch (error) {
    console.error('Delete printer error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting printer.',
    });
  }
};

// @desc    Set default printer
// @route   PUT /api/printers/:id/default
// @access  Private
const setDefaultPrinter = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check ownership
    const existing = await pool.query(
      'SELECT id FROM printer_settings WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Printer not found.',
      });
    }

    // Remove default from all user's printers
    await pool.query(
      'UPDATE printer_settings SET is_default = FALSE WHERE user_id = $1',
      [userId]
    );

    // Set this printer as default
    const result = await pool.query(
      `UPDATE printer_settings SET is_default = TRUE WHERE id = $1 RETURNING *`,
      [id]
    );

    res.json({
      success: true,
      message: 'Default printer set successfully.',
      printer: result.rows[0],
    });

  } catch (error) {
    console.error('Set default printer error:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting default printer.',
    });
  }
};

// @desc    Get available network printers (mock - in production would scan network)
// @route   GET /api/printers/available
// @access  Private
const getAvailablePrinters = async (req, res) => {
  try {
    // In a real implementation, this would scan the network for available printers
    // For now, returning a mock response
    const mockPrinters = [
      { name: 'Network Printer 1', ip: '192.168.1.100', type: 'wifi' },
      { name: 'Network Printer 2', ip: '192.168.1.101', type: 'network' },
    ];

    res.json({
      success: true,
      printers: mockPrinters,
      message: 'Note: This is a mock response. Implement network scanning for production.',
    });

  } catch (error) {
    console.error('Get available printers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error scanning for printers.',
    });
  }
};

// @desc    Get print history for an order
// @route   GET /api/printers/history/:orderId
// @access  Private
const getPrintHistory = async (req, res) => {
  try {
    const { orderId } = req.params;
    const printerService = require('../services/printerService');
    
    const history = await printerService.getPrintHistory(parseInt(orderId));
    
    res.json({
      success: true,
      history,
    });
    
  } catch (error) {
    console.error('Get print history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching print history.',
    });
  }
};

// @desc    Retry printing a failed order
// @route   POST /api/printers/retry/:orderId
// @access  Private (Admin, Manager)
const retryPrint = async (req, res) => {
  try {
    const { orderId } = req.params;
    const printerService = require('../services/printerService');
    
    await printerService.printOrderBill(parseInt(orderId), true);
    
    res.json({
      success: true,
      message: 'Print retry initiated.',
    });
    
  } catch (error) {
    console.error('Retry print error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retry printing.',
    });
  }
};

module.exports = {
  getPrinters,
  addPrinter,
  updatePrinter,
  deletePrinter,
  setDefaultPrinter,
  getAvailablePrinters,
  getPrintHistory,
  retryPrint,
};
