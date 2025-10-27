const pool = require('../config/database');

// @desc    Create return request
// @route   POST /api/returns
// @access  Private
const createReturnRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { order_id, order_item_id, reason } = req.body;

    if (!order_id || !order_item_id || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Order ID, order item ID, and reason are required.',
      });
    }

    // Verify order belongs to user
    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
      [order_id, userId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    const order = orderResult.rows[0];

    // Check if order is approved
    if (order.approval_status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Can only request returns for approved orders.',
      });
    }

    // Verify order item exists and belongs to this order
    const orderItemResult = await pool.query(
      `SELECT oi.*, p.return_days
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.id = $1 AND oi.order_id = $2`,
      [order_item_id, order_id]
    );

    if (orderItemResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order item not found.',
      });
    }

    const orderItem = orderItemResult.rows[0];

    // Check if product allows returns
    if (orderItem.return_days === 0) {
      return res.status(400).json({
        success: false,
        message: 'This product is not eligible for returns.',
      });
    }

    // Check if return period has expired
    const orderDate = new Date(order.created_at);
    const currentDate = new Date();
    const daysSinceOrder = Math.floor((currentDate - orderDate) / (1000 * 60 * 60 * 24));

    if (daysSinceOrder > orderItem.return_days) {
      return res.status(400).json({
        success: false,
        message: `Return period of ${orderItem.return_days} days has expired.`,
      });
    }

    // Check if return request already exists
    const existingReturn = await pool.query(
      'SELECT * FROM return_requests WHERE order_item_id = $1',
      [order_item_id]
    );

    if (existingReturn.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Return request already exists for this item.',
      });
    }

    // Create return request
    const result = await pool.query(
      `INSERT INTO return_requests (order_id, order_item_id, user_id, reason)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [order_id, order_item_id, userId, reason]
    );

    // Notify managers and admins
    const managersResult = await pool.query(
      `SELECT id FROM users WHERE role IN ('admin', 'manager')`
    );

    for (const manager of managersResult.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          manager.id,
          'return_request',
          'New Return Request',
          `Return request for order #${order_id}`,
          result.rows[0].id,
          'return',
        ]
      );
    }

    res.status(201).json({
      success: true,
      message: 'Return request submitted successfully.',
      returnRequest: result.rows[0],
    });
  } catch (error) {
    console.error('Create return request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating return request.',
    });
  }
};

// @desc    Get return requests
// @route   GET /api/returns
// @access  Private
const getReturnRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { status, page = 1, limit = 20 } = req.query;

    let query = `
      SELECT rr.*, o.razorpay_order_id, u.name as customer_name, u.email as customer_email,
             oi.quantity, oi.price_at_purchase, p.name as product_name, p.image_url,
             r.name as reviewed_by_name
      FROM return_requests rr
      LEFT JOIN orders o ON rr.order_id = o.id
      LEFT JOIN order_items oi ON rr.order_item_id = oi.id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN users u ON rr.user_id = u.id
      LEFT JOIN users r ON rr.reviewed_by = r.id
      WHERE 1=1
    `;

    const params = [];
    let paramCounter = 1;

    // Customers can only see their own return requests
    if (userRole === 'customer') {
      query += ` AND rr.user_id = $${paramCounter}`;
      params.push(userId);
      paramCounter++;
    }

    if (status) {
      query += ` AND rr.status = $${paramCounter}`;
      params.push(status);
      paramCounter++;
    }

    query += ` ORDER BY rr.created_at DESC`;

    // Pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      returnRequests: result.rows,
    });
  } catch (error) {
    console.error('Get return requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching return requests.',
    });
  }
};

// @desc    Get single return request
// @route   GET /api/returns/:id
// @access  Private
const getReturnRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const result = await pool.query(
      `SELECT rr.*, o.razorpay_order_id, o.shipping_address, 
              u.name as customer_name, u.email as customer_email,
              oi.quantity, oi.price_at_purchase, p.name as product_name, p.image_url,
              r.name as reviewed_by_name
       FROM return_requests rr
       LEFT JOIN orders o ON rr.order_id = o.id
       LEFT JOIN order_items oi ON rr.order_item_id = oi.id
       LEFT JOIN products p ON oi.product_id = p.id
       LEFT JOIN users u ON rr.user_id = u.id
       LEFT JOIN users r ON rr.reviewed_by = r.id
       WHERE rr.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Return request not found.',
      });
    }

    const returnRequest = result.rows[0];

    // Check authorization
    if (userRole === 'customer' && returnRequest.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied.',
      });
    }

    res.json({
      success: true,
      returnRequest,
    });
  } catch (error) {
    console.error('Get return request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching return request.',
    });
  }
};

// @desc    Update return request status
// @route   PUT /api/returns/:id/status
// @access  Private (Admin, Manager)
const updateReturnStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { status, admin_notes } = req.body;

    const validStatuses = ['requested', 'approved', 'rejected', 'processing', 'completed'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value.',
      });
    }

    // Get return request details
    const returnResult = await pool.query(
      'SELECT * FROM return_requests WHERE id = $1',
      [id]
    );

    if (returnResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Return request not found.',
      });
    }

    const returnRequest = returnResult.rows[0];

    // Update return request
    const result = await pool.query(
      `UPDATE return_requests 
       SET status = $1, admin_notes = $2, reviewed_by = $3, 
           reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [status, admin_notes || null, userId, id]
    );

    // Notify customer
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        returnRequest.user_id,
        'return_status',
        'Return Request Update',
        `Your return request has been ${status}`,
        id,
        'return',
      ]
    );

    res.json({
      success: true,
      message: 'Return request updated successfully.',
      returnRequest: result.rows[0],
    });
  } catch (error) {
    console.error('Update return status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating return request.',
    });
  }
};

// @desc    Check if item can be returned
// @route   GET /api/returns/check/:orderId/:orderItemId
// @access  Private
const checkReturnEligibility = async (req, res) => {
  try {
    const { orderId, orderItemId } = req.params;
    const userId = req.user.id;

    // Verify order belongs to user
    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
      [orderId, userId]
    );

    if (orderResult.rows.length === 0) {
      return res.json({
        success: true,
        eligible: false,
        reason: 'Order not found.',
      });
    }

    const order = orderResult.rows[0];

    // Check if order is approved
    if (order.approval_status !== 'approved') {
      return res.json({
        success: true,
        eligible: false,
        reason: 'Order must be approved before requesting returns.',
      });
    }

    // Get order item with product return policy
    const orderItemResult = await pool.query(
      `SELECT oi.*, p.return_days, p.name as product_name
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.id = $1 AND oi.order_id = $2`,
      [orderItemId, orderId]
    );

    if (orderItemResult.rows.length === 0) {
      return res.json({
        success: true,
        eligible: false,
        reason: 'Order item not found.',
      });
    }

    const orderItem = orderItemResult.rows[0];

    // Check if product allows returns
    if (orderItem.return_days === 0) {
      return res.json({
        success: true,
        eligible: false,
        reason: 'This product is not eligible for returns.',
      });
    }

    // Check if return period has expired
    const orderDate = new Date(order.created_at);
    const currentDate = new Date();
    const daysSinceOrder = Math.floor((currentDate - orderDate) / (1000 * 60 * 60 * 24));
    const daysRemaining = orderItem.return_days - daysSinceOrder;

    if (daysSinceOrder > orderItem.return_days) {
      return res.json({
        success: true,
        eligible: false,
        reason: `Return period of ${orderItem.return_days} days has expired.`,
      });
    }

    // Check if return request already exists
    const existingReturn = await pool.query(
      'SELECT * FROM return_requests WHERE order_item_id = $1',
      [orderItemId]
    );

    if (existingReturn.rows.length > 0) {
      return res.json({
        success: true,
        eligible: false,
        reason: 'Return request already exists for this item.',
        existingRequest: existingReturn.rows[0],
      });
    }

    res.json({
      success: true,
      eligible: true,
      daysRemaining,
      returnDays: orderItem.return_days,
    });
  } catch (error) {
    console.error('Check return eligibility error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking return eligibility.',
    });
  }
};

module.exports = {
  createReturnRequest,
  getReturnRequests,
  getReturnRequestById,
  updateReturnStatus,
  checkReturnEligibility,
};

