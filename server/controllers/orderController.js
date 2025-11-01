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

    // Check if order_number column exists for GROUP BY
    const orderNumberCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' AND column_name = 'order_number'
    `);
    const hasOrderNumber = orderNumberCheck.rows.length > 0;

    if (hasOrderNumber) {
      query += ` GROUP BY o.id, u.name, u.email, o.order_number ORDER BY o.created_at DESC`;
    } else {
      query += ` GROUP BY o.id, u.name, u.email ORDER BY o.created_at DESC`;
    }

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

    // Get order with user details
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
        message: 'Order not found.' 
      });
    }

    const oldOrder = orderResult.rows[0];

    // Update order status
    const result = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    const order = result.rows[0];

    // Send email notification if status changed to processing, shipped, or delivered
    if (['processing', 'shipped', 'delivered'].includes(status) && oldOrder.status !== status) {
      try {
        const { sendEmail } = require('../utils/emailService');
        await sendEmail(
          oldOrder.customer_email,
          'orderStatusUpdate',
          [oldOrder.customer_name, { ...order, status }]
        );
      } catch (emailError) {
        console.error('Failed to send order status update email:', emailError);
        // Don't fail the request if email fails
      }
    }

    res.json({
      success: true,
      message: 'Order status updated.',
      order,
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

    // Check if user_addresses table exists
    let hasAddressesTable = false;
    try {
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'user_addresses'
        )
      `);
      hasAddressesTable = tableCheck.rows[0].exists;
    } catch (error) {
      console.error('Error checking user_addresses table:', error);
    }

    // Build query based on whether user_addresses table exists
    let query;
    if (hasAddressesTable) {
      query = `
        SELECT o.*, 
               u.name as customer_name, 
               u.email as customer_email,
               u.mobile_number as customer_mobile,
               ua.full_name as shipping_full_name,
               ua.address_line1, ua.address_line2,
               ua.city as shipping_city,
               ua.state as shipping_state,
               ua.pincode as shipping_pincode,
               ua.country as shipping_country,
               ua.mobile_number as shipping_mobile_from_address,
               COUNT(DISTINCT oi.id) as item_count
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        LEFT JOIN user_addresses ua ON o.shipping_address_id = ua.id
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE (o.approval_status = 'pending_approval' OR o.approval_status IS NULL OR o.approval_status = 'pending')
        GROUP BY o.id, u.name, u.email, u.mobile_number, 
                 ua.id, ua.full_name, ua.address_line1, ua.address_line2, 
                 ua.city, ua.state, ua.pincode, ua.country, ua.mobile_number
        ORDER BY o.created_at ASC
      `;
    } else {
      // Fallback query if user_addresses table doesn't exist
      query = `
        SELECT o.*, 
               u.name as customer_name, 
               u.email as customer_email,
               COUNT(DISTINCT oi.id) as item_count
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE (o.approval_status = 'pending_approval' OR o.approval_status IS NULL OR o.approval_status = 'pending')
        GROUP BY o.id, u.name, u.email
        ORDER BY o.created_at ASC
      `;
    }

    const offset = (page - 1) * limit;
    const params = [parseInt(limit), offset];
    
    const result = await pool.query(query + ' LIMIT $1 OFFSET $2', params);

    // Get order items for each order
    for (const order of result.rows) {
      const itemsResult = await pool.query(
        `SELECT oi.*, p.name as product_name, p.image_url, p.price as current_price
         FROM order_items oi
         LEFT JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = $1`,
        [order.id]
      );
      order.items = itemsResult.rows;
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total 
       FROM orders 
       WHERE approval_status = 'pending_approval' 
          OR approval_status IS NULL 
          OR approval_status = 'pending'`
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

    // Validate that approval_status is provided
    if (!approval_status) {
      return res.status(400).json({
        success: false,
        message: 'Approval status is required. Must be "approved" or "rejected".',
      });
    }

    const validStatuses = ['approved', 'rejected'];

    if (!validStatuses.includes(approval_status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid approval status: "${approval_status}". Must be "approved" or "rejected".`,
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
    // Fix type conflict by using separate parameter for CASE statement
    const newStatus = approval_status === 'approved' ? 'processing' : 'cancelled';
    
    // Check if approval_status column exists, update accordingly
    let result;
    try {
      // Try with approval_status column first
      result = await pool.query(
        `UPDATE orders 
         SET approval_status = $1::text, approved_by = $2, approved_at = CURRENT_TIMESTAMP,
             status = $4
         WHERE id = $3
         RETURNING *`,
        [approval_status, userId, id, newStatus]
      );
    } catch (error) {
      // If approval_status column doesn't exist, try without it
      if (error.message?.includes('column') && error.message?.includes('approval_status')) {
        result = await pool.query(
          `UPDATE orders 
           SET approved_by = $1, approved_at = CURRENT_TIMESTAMP,
               status = $2
           WHERE id = $3
           RETURNING *`,
          [userId, newStatus, id]
        );
        // Add approval_status to result for consistency
        result.rows[0].approval_status = approval_status;
      } else {
        throw error; // Re-throw if it's a different error
      }
    }

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
      `SELECT o.*, u.name as customer_name, u.email as customer_email, u.mobile_number as customer_mobile,
              ua.full_name as shipping_full_name, ua.address_line1, ua.address_line2, 
              ua.city as shipping_city, ua.state as shipping_state, ua.pincode as shipping_pincode,
              ua.country as shipping_country, ua.mobile_number as shipping_mobile_from_address
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       LEFT JOIN user_addresses ua ON o.shipping_address_id = ua.id
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

    // Get order items
    const itemsResult = await pool.query(
      `SELECT oi.*, p.name as product_name, p.image_url, p.product_code
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [id]
    );

    // Check if order_number column exists
    const orderNumberCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' AND column_name = 'order_number'
    `);
    const hasOrderNumber = orderNumberCheck.rows.length > 0;

    // Build FROM address (Company address)
    const fromAddress = {
      name: 'Sallapuradamma textiles',
      address_line1: '123 Business Street',
      address_line2: 'Commercial Area',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      country: 'India',
      mobile: '+91-80-12345678',
      email: 'support@sallapuradammatextiles.com',
    };

    // Build TO address (Shipping address)
    let toAddress = {
      name: order.customer_name || 'Customer',
      mobile: order.shipping_mobile || order.shipping_mobile_from_address || order.customer_mobile || 'N/A',
      email: order.customer_email || '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
    };

    if (order.shipping_address_id && order.shipping_full_name) {
      // Use address from user_addresses table
      toAddress.address_line1 = order.address_line1 || '';
      toAddress.address_line2 = order.address_line2 || '';
      toAddress.city = order.shipping_city || '';
      toAddress.state = order.shipping_state || '';
      toAddress.pincode = order.shipping_pincode || order.shipping_pincode_db || '';
      toAddress.country = order.shipping_country || 'India';
      toAddress.name = order.shipping_full_name || order.customer_name || 'Customer';
      toAddress.mobile = order.shipping_mobile_from_address || order.shipping_mobile || order.customer_mobile || 'N/A';
    } else if (order.shipping_address) {
      // Parse from shipping_address text field
      const addressLines = (order.shipping_address || '').split('\n');
      toAddress.address_line1 = addressLines[0] || '';
      toAddress.address_line2 = addressLines[1] || '';
      if (addressLines[2]) {
        const cityStateMatch = addressLines[2].match(/(.+?),\s*(.+?)\s*-\s*(\d{6})/);
        if (cityStateMatch) {
          toAddress.city = cityStateMatch[1].trim();
          toAddress.state = cityStateMatch[2].trim();
          toAddress.pincode = cityStateMatch[3];
        } else {
          toAddress.city = addressLines[2] || '';
        }
      }
      toAddress.country = addressLines[3] || 'India';
      
      // Extract mobile from address if not already set
      if (!toAddress.mobile || toAddress.mobile === 'N/A') {
        const mobileMatch = order.shipping_address.match(/Mobile[:\s]+(\d{10})/i);
        if (mobileMatch) {
          toAddress.mobile = mobileMatch[1];
        }
      }
      
      // Extract pincode if not set
      if (!toAddress.pincode) {
        toAddress.pincode = order.shipping_pincode || '';
      }
    } else {
      // Fallback if no address data
      toAddress.address_line1 = 'Address not available';
      toAddress.city = '';
      toAddress.state = '';
      toAddress.pincode = '';
      toAddress.country = 'India';
    }

    // Determine payment status
    const paymentStatus = order.razorpay_payment_id ? 'Paid' : 
                          order.status === 'pending' ? 'Pending' : 
                          order.status === 'cancelled' ? 'Cancelled' : 'Paid';

    // Get order_number if column exists
    let finalOrderNumber = `ORD-${order.id}`;
    if (hasOrderNumber && !order.order_number) {
      // Fetch order_number separately if not in join result
      const orderNumResult = await pool.query(
        'SELECT order_number FROM orders WHERE id = $1',
        [id]
      );
      finalOrderNumber = orderNumResult.rows[0]?.order_number || finalOrderNumber;
    } else if (order.order_number) {
      finalOrderNumber = order.order_number;
    }

    // Prepare bill data
    const billData = {
      orderId: order.id,
      orderNumber: finalOrderNumber,
      orderDate: order.created_at,
      fromAddress,
      toAddress,
      customerName: order.customer_name || 'Customer',
      customerEmail: order.customer_email || '',
      customerMobile: order.customer_mobile || toAddress.mobile || 'N/A',
      shippingAddress: order.shipping_address || toAddress.address_line1 || '',
      shippingMobile: order.shipping_mobile || toAddress.mobile || 'N/A',
      shippingPincode: order.shipping_pincode || toAddress.pincode || '',
      items: itemsResult.rows.map(item => ({
        productName: item.product_name || 'Unknown Product',
        productCode: item.product_code || 'N/A',
        quantity: parseInt(item.quantity) || 0,
        pricePerUnit: parseFloat(item.price_at_purchase || 0),
        total: parseFloat(item.price_at_purchase || 0) * (parseInt(item.quantity) || 0),
      })),
      subtotal: parseFloat(order.total_price || 0),
      tax: parseFloat(order.total_price || 0) * 0.0, // Add tax calculation if needed
      shipping: 0,
      total: parseFloat(order.total_price || 0),
      paymentStatus,
      razorpayOrderId: order.razorpay_order_id || null,
      razorpayPaymentId: order.razorpay_payment_id || null,
      razorpaySignature: order.razorpay_signature || null,
      transactionId: order.razorpay_payment_id || order.razorpay_order_id || 'N/A',
      status: order.status || 'pending',
      approvalStatus: order.approval_status || null,
    };

    res.json({
      success: true,
      bill: billData,
    });
  } catch (error) {
    console.error('Generate bill error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
    });
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'production' 
        ? 'Error generating bill.' 
        : `Error generating bill: ${error.message}`,
      ...(process.env.NODE_ENV !== 'production' && { 
        error: error.message,
        stack: error.stack 
      }),
    });
  }
};

// @desc    Print bill as PDF
// @route   POST /api/orders/:id/print
// @access  Private (Admin, Manager)
const printBillPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const printerService = require('../services/printerService');
    
    await printerService.printOrderBill(parseInt(id));
    
    res.json({
      success: true,
      message: 'Bill sent to printer successfully.',
    });
  } catch (error) {
    console.error('Print bill error:', error);
    res.status(500).json({
      success: false,
      message: 'Error printing bill.',
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
  printBillPDF,
};
