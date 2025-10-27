const pool = require('../config/database');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// @desc    Create Razorpay order
// @route   POST /api/checkout/create-order
// @access  Private
const createRazorpayOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { shipping_address, currency = 'INR' } = req.body;

    if (!shipping_address || !shipping_address.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Shipping address is required.',
      });
    }

    // Get cart items and calculate total
    const cartResult = await pool.query(
      `SELECT ci.*, p.price, p.name, p.stock_quantity
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = $1`,
      [userId]
    );

    if (cartResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty.',
      });
    }

    // Calculate total amount
    const totalAmount = cartResult.rows.reduce((total, item) => {
      return total + (parseFloat(item.price) * item.quantity);
    }, 0);

    if (totalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid cart total.',
      });
    }

    // Create Razorpay order
    const options = {
      amount: Math.round(totalAmount * 100), // Amount in paise
      currency,
      receipt: `order_${userId}_${Date.now()}`,
    };

    const razorpayOrder = await razorpay.orders.create(options);

    // Store order in database with pending status
    const orderResult = await pool.query(
      `INSERT INTO orders (user_id, razorpay_order_id, total_price, status, shipping_address, approval_status)
       VALUES ($1, $2, $3, 'pending', $4, 'pending')
       RETURNING id`,
      [userId, razorpayOrder.id, totalAmount, shipping_address]
    );

    const orderId = orderResult.rows[0].id;

    res.json({
      success: true,
      order: {
        id: orderId,
        razorpayOrderId: razorpayOrder.id,
        amount: totalAmount,
        currency: razorpayOrder.currency,
      },
    });

  } catch (error) {
    console.error('Create Razorpay order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating payment order.',
      error: error.message,
    });
  }
};

// @desc    Verify Razorpay payment and create order
// @route   POST /api/checkout/verify-payment
// @access  Private
const verifyPayment = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const userId = req.user.id;
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      cart_items,
      shipping_address,
      total_price,
    } = req.body;

    // Verify signature
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed.',
      });
    }

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders (user_id, razorpay_order_id, razorpay_payment_id, shipping_address, total_price, status, approval_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, razorpay_order_id, razorpay_payment_id, shipping_address, total_price, 'pending', 'pending_approval']
    );

    const order = orderResult.rows[0];

    // Create order items
    for (const item of cart_items) {
      // Get current product price and update stock
      const productResult = await client.query(
        'SELECT id, price, stock_quantity FROM products WHERE id = $1',
        [item.product_id]
      );

      if (productResult.rows.length === 0) {
        throw new Error(`Product with ID ${item.product_id} not found.`);
      }

      const product = productResult.rows[0];

      if (product.stock_quantity < item.quantity) {
        throw new Error(`Insufficient stock for product ID ${item.product_id}.`);
      }

      // Insert order item
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase)
         VALUES ($1, $2, $3, $4)`,
        [order.id, item.product_id, item.quantity, product.price]
      );

      // Update product stock
      await client.query(
        'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }

    // Clear user's cart
    await client.query('DELETE FROM cart WHERE user_id = $1', [userId]);

    // Notify managers/admins about new order
    const managersResult = await client.query(
      `SELECT id FROM users WHERE role IN ('admin', 'manager')`
    );

    for (const manager of managersResult.rows) {
      await client.query(
        `INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          manager.id,
          'new_order',
          'New Order Placed',
          `A new order #${order.id} has been placed and requires approval.`,
          order.id,
          'order'
        ]
      );
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Payment verified and order created successfully.',
      order,
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error processing payment.',
    });
  } finally {
    client.release();
  }
};

module.exports = {
  createOrder: createRazorpayOrder,
  verifyPayment,
};
