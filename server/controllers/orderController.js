const pool = require('../config/database');

// @desc    Get all orders (Admin/Manager)
// @route   GET /api/orders
// @access  Private (Admin, Manager)
const getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    let query = `
      SELECT o.*, u.name as customer_name, u.email as customer_email,
             COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE 1=1
    `;

    const params = [];
    let paramCounter = 1;

    if (status) {
      query += ` AND o.status = $${paramCounter}`;
      params.push(status);
      paramCounter++;
    }

    query += ` GROUP BY o.id, u.name, u.email ORDER BY o.created_at DESC`;

    // Pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM orders WHERE 1=1';
    const countParams = [];

    if (status) {
      countQuery += ' AND status = $1';
      countParams.push(status);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalOrders = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      orders: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalOrders,
        pages: Math.ceil(totalOrders / limit),
      },
    });

  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching orders.' 
    });
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get order with items
    const orderResult = await pool.query(`
      SELECT o.*, u.name as customer_name, u.email as customer_email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = $1
    `, [id]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found.' 
      });
    }

    const order = orderResult.rows[0];

    // Check authorization (customers can only see their own orders)
    if (userRole === 'customer' && order.user_id !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied.' 
      });
    }

    // Get order items
    const itemsResult = await pool.query(`
      SELECT oi.*, p.name as product_name, p.image_url
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `, [id]);

    order.items = itemsResult.rows;

    res.json({
      success: true,
      order,
    });

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching order.' 
    });
  }
};

// @desc    Get user's orders
// @route   GET /api/orders/my/list
// @access  Private
const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(`
      SELECT o.*, COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, [userId]);

    res.json({
      success: true,
      orders: result.rows,
    });

  } catch (error) {
    console.error('Get my orders error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching orders.' 
    });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private (Admin, Manager)
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status value.' 
      });
    }

    const result = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found.' 
      });
    }

    res.json({
      success: true,
      message: 'Order status updated.',
      order: result.rows[0],
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating order status.' 
    });
  }
};

// @desc    Get order statistics (Admin/Manager)
// @route   GET /api/orders/stats/summary
// @access  Private (Admin, Manager)
const getOrderStats = async (req, res) => {
  try {
    // Total orders
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM orders');
    
    // Orders by status
    const statusResult = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM orders
      GROUP BY status
    `);

    // Total revenue
    const revenueResult = await pool.query(`
      SELECT SUM(total_price) as total_revenue
      FROM orders
      WHERE status NOT IN ('cancelled', 'pending')
    `);

    // Recent orders
    const recentResult = await pool.query(`
      SELECT o.*, u.name as customer_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      stats: {
        totalOrders: parseInt(totalResult.rows[0].total),
        ordersByStatus: statusResult.rows,
        totalRevenue: parseFloat(revenueResult.rows[0].total_revenue || 0).toFixed(2),
        recentOrders: recentResult.rows,
      },
    });

  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching order statistics.' 
    });
  }
};

// @desc    Get pending approval orders (Admin/Manager)
// @route   GET /api/orders/pending-approval
// @access  Private (Admin, Manager)
const getPendingApprovalOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const query = `
      SELECT o.*, u.name as customer_name, u.email as customer_email,
             COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.approval_status = 'pending_approval'
      GROUP BY o.id, u.name, u.email
      ORDER BY o.created_at ASC
    `;

    const offset = (page - 1) * limit;
    const params = [parseInt(limit), offset];
    
    const result = await pool.query(query + ' LIMIT $1 OFFSET $2', params);

    // Get total count
    const countResult = await pool.query(
      "SELECT COUNT(*) as total FROM orders WHERE approval_status = 'pending_approval'"
    );

    res.json({
      success: true,
      orders: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / limit),
      },
    });
  } catch (error) {
    console.error('Get pending approval orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending approval orders.',
    });
  }
};

// @desc    Approve or reject order
// @route   PUT /api/orders/:id/approval
// @access  Private (Admin, Manager)
const updateOrderApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { approval_status } = req.body;

    const validStatuses = ['approved', 'rejected'];

    if (!validStatuses.includes(approval_status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid approval status. Must be "approved" or "rejected".',
      });
    }

    // Get order details first
    const orderResult = await pool.query(
      `SELECT o.*, u.name as customer_name, u.email as customer_email
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    const order = orderResult.rows[0];

    // Update approval status
    const result = await pool.query(
      `UPDATE orders 
       SET approval_status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP,
           status = CASE WHEN $1 = 'approved' THEN 'processing' ELSE 'cancelled' END
       WHERE id = $3
       RETURNING *`,
      [approval_status, userId, id]
    );

    // Notify customer
    const notificationTitle = approval_status === 'approved' 
      ? 'Order Approved' 
      : 'Order Rejected';
    const notificationMessage = approval_status === 'approved'
      ? `Your order #${id} has been approved and is now being processed.`
      : `Your order #${id} has been rejected. Please contact support for more information.`;

    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [order.user_id, 'order_status', notificationTitle, notificationMessage, id, 'order']
    );

    res.json({
      success: true,
      message: `Order ${approval_status} successfully.`,
      order: result.rows[0],
    });
  } catch (error) {
    console.error('Update order approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating order approval.',
    });
  }
};

// @desc    Generate bill for order
// @route   GET /api/orders/:id/bill
// @access  Private
const generateBill = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get order with full details
    const orderResult = await pool.query(
      `SELECT o.*, u.name as customer_name, u.email as customer_email, u.default_address
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    const order = orderResult.rows[0];

    // Check authorization
    if (userRole === 'customer' && order.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied.',
      });
    }

    // Check if order is approved
    if (order.approval_status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Bill can only be generated for approved orders.',
      });
    }

    // Get order items
    const itemsResult = await pool.query(
      `SELECT oi.*, p.name as product_name, p.image_url
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [id]
    );

    // Prepare bill data
    const billData = {
      orderId: order.id,
      orderDate: order.created_at,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      shippingAddress: order.shipping_address,
      items: itemsResult.rows.map(item => ({
        productName: item.product_name,
        quantity: item.quantity,
        pricePerUnit: parseFloat(item.price_at_purchase),
        total: parseFloat(item.price_at_purchase) * item.quantity,
      })),
      subtotal: parseFloat(order.total_price),
      tax: parseFloat(order.total_price) * 0.0, // Add tax calculation if needed
      total: parseFloat(order.total_price),
      paymentId: order.razorpay_payment_id,
      status: order.status,
    };

    res.json({
      success: true,
      bill: billData,
    });
  } catch (error) {
    console.error('Generate bill error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating bill.',
    });
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  getMyOrders,
  updateOrderStatus,
  getOrderStats,
  getPendingApprovalOrders,
  updateOrderApproval,
  generateBill,
};
