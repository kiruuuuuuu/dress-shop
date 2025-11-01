const pool = require('../config/database');
const crypto = require('crypto');

// Payment mode: 'razorpay' or 'mock'
const PAYMENT_MODE = process.env.PAYMENT_MODE || 'mock';

// Initialize Razorpay (only if using Razorpay)
let razorpay;
if (PAYMENT_MODE === 'razorpay') {
  try {
    const Razorpay = require('razorpay');
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  } catch (error) {
    console.error('Failed to initialize Razorpay:', error);
  }
}

// @desc    Create payment order (Razorpay or Mock)
// @route   POST /api/checkout/create-order
// @access  Private
const createRazorpayOrder = async (req, res) => {
  try {
    console.log('🛒 Creating order for user:', req.user.id);
    const userId = req.user.id;
    const { shipping_address, shipping_address_id, currency = 'INR' } = req.body;

    let shippingAddressText = '';
    let shippingMobile = '';
    let shippingPincode = '';
    let addressId = null;

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

    // If address_id is provided and table exists, get address details
    if (shipping_address_id && hasAddressesTable) {
      try {
        const addressResult = await pool.query(
          `SELECT * FROM user_addresses WHERE id = $1 AND user_id = $2`,
          [shipping_address_id, userId]
        );

        if (addressResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Shipping address not found.',
          });
        }

        const address = addressResult.rows[0];
        addressId = address.id;
        shippingMobile = address.mobile_number;
        shippingPincode = address.pincode;
        
        // Build formatted address string
        const houseNumberPart = address.house_number ? `House No: ${address.house_number}\n` : '';
        shippingAddressText = `${address.full_name}\n${houseNumberPart}${address.address_line1}${address.address_line2 ? ', ' + address.address_line2 : ''}\n${address.city}, ${address.state} - ${address.pincode}\n${address.country || 'India'}\nMobile: ${address.mobile_number}`;
      } catch (error) {
        console.error('Error fetching address from user_addresses:', error);
        // Fallback to text address if address lookup fails
        if (shipping_address && shipping_address.trim()) {
          shippingAddressText = shipping_address.trim();
          const mobileMatch = shipping_address.match(/Mobile[:\s]+(\d{10})/i);
          const pincodeMatch = shipping_address.match(/-?\s*(\d{6})/);
          if (mobileMatch) shippingMobile = mobileMatch[1];
          if (pincodeMatch) shippingPincode = pincodeMatch[1];
        }
      }
    } else if (shipping_address && shipping_address.trim()) {
      // Fallback: use plain text address (for backward compatibility)
      shippingAddressText = shipping_address.trim();
      
      // Try to extract mobile and pincode from text address if possible
      const mobileMatch = shipping_address.match(/Mobile[:\s]+(\d{10})/i);
      const pincodeMatch = shipping_address.match(/-?\s*(\d{6})/);
      
      if (mobileMatch) {
        shippingMobile = mobileMatch[1];
      }
      if (pincodeMatch) {
        shippingPincode = pincodeMatch[1];
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Shipping address is required. Please select an address or enter a shipping address.',
      });
    }

    // Validate mobile number if provided (for backward compatibility, make it optional for now)
    if (shippingMobile) {
      const mobileRegex = /^[6-9]\d{9}$/;
      if (!mobileRegex.test(shippingMobile)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid mobile number. Must be 10 digits starting with 6-9.',
        });
      }
    }
    // Note: Mobile and pincode are optional for backward compatibility
    // They will be required in the future when address management UI is implemented

    // Validate pincode if provided
    if (shippingPincode) {
      const pincodeRegex = /^\d{6}$/;
      if (!pincodeRegex.test(shippingPincode)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid pincode. Must be 6 digits.',
        });
      }
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

    let orderId;
    let paymentOrderId;
    let paymentAmount = totalAmount;

    if (PAYMENT_MODE === 'razorpay') {
      // Use Razorpay
      if (!razorpay) {
        return res.status(500).json({
          success: false,
          message: 'Payment gateway not configured. Please check Razorpay configuration.',
        });
      }

      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        return res.status(500).json({
          success: false,
          message: 'Payment gateway not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables.',
        });
      }

      // Create Razorpay order
      const options = {
        amount: Math.round(totalAmount * 100), // Amount in paise
        currency,
        receipt: `order_${userId}_${Date.now()}`,
      };

      const razorpayOrder = await razorpay.orders.create(options);
      paymentOrderId = razorpayOrder.id;
      paymentAmount = totalAmount;
    } else {
      // Use Mock Payment
      // Generate a mock order ID
      paymentOrderId = `mock_order_${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      paymentAmount = totalAmount;
    }

    // Generate unique order number
    const generateOrderNumber = () => {
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      return `ORD-${timestamp}-${random}`;
    };
    
    let orderNumber = generateOrderNumber();
    
    // Ensure uniqueness
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      const checkResult = await pool.query(
        'SELECT id FROM orders WHERE order_number = $1',
        [orderNumber]
      );
      if (checkResult.rows.length === 0) {
        isUnique = true;
      } else {
        orderNumber = generateOrderNumber();
        attempts++;
      }
    }

    // Store order in database with pending status
    // Try with approval_status first, fallback if column doesn't exist
    let orderResult;
    try {
      console.log('🔍 Checking database schema...');
      // Check which columns exist
      const approvalCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'approval_status'
      `);
      
      const addressIdCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'shipping_address_id'
      `);
      
      const mobileCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'shipping_mobile'
      `);
      
      const pincodeCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'shipping_pincode'
      `);

      const orderNumberCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'order_number'
      `);
      
      console.log('✅ Schema check complete');

      const hasApprovalStatus = approvalCheck.rows.length > 0;
      const hasAddressId = addressIdCheck.rows.length > 0;
      const hasMobile = mobileCheck.rows.length > 0;
      const hasPincode = pincodeCheck.rows.length > 0;
      const hasOrderNumber = orderNumberCheck.rows.length > 0;

      // Build query dynamically based on available columns
      let columns = ['user_id', 'razorpay_order_id', 'total_price', 'status', 'shipping_address'];
      let values = [userId, paymentOrderId, paymentAmount, 'pending', shippingAddressText];
      let paramCount = 5;

      if (hasOrderNumber) {
        columns.push('order_number');
        values.push(orderNumber);
        paramCount++;
      }

      // Removed approval_status - orders are auto-approved

      if (hasAddressId && addressId) {
        columns.push('shipping_address_id');
        values.push(addressId);
        paramCount++;
      }

      if (hasMobile && shippingMobile) {
        columns.push('shipping_mobile');
        values.push(shippingMobile);
        paramCount++;
      }

      if (hasPincode && shippingPincode) {
        columns.push('shipping_pincode');
        values.push(shippingPincode);
        paramCount++;
      }

      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

      orderResult = await pool.query(
        `INSERT INTO orders (${columns.join(', ')})
         VALUES (${placeholders})
         RETURNING id`,
        values
      );
    } catch (error) {
      // If there's still an error, log it and re-throw
      console.error('Error inserting order into database:', error);
      throw error;
    }

    orderId = orderResult.rows[0].id;
    
    // Get the order_number from the result if it exists
    const finalOrderNumber = orderResult.rows[0].order_number || orderNumber;

    console.log('✅ Order created successfully:', orderId);

    res.json({
      success: true,
      order: {
        id: orderId,
        orderNumber: finalOrderNumber,
        razorpayOrderId: paymentOrderId,
        amount: paymentAmount,
        currency: currency,
        paymentMode: PAYMENT_MODE,
      },
    });

  } catch (error) {
    console.error('Create payment order error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    
    // Provide more detailed error message
    let errorMessage = 'Error creating payment order.';
    
    if (error.message?.includes('column') && error.message?.includes('does not exist')) {
      errorMessage = 'Database schema error. Please run: npm run db:init';
    } else if (error.message?.includes('RAZORPAY') || error.message?.includes('razorpay') || error.message?.includes('key_id') || error.message?.includes('key_secret')) {
      errorMessage = 'Razorpay configuration error. Please check your Razorpay keys in .env file.';
    } else if (error.message?.includes('authentication') || error.message?.includes('invalid')) {
      errorMessage = 'Invalid Razorpay credentials. Please check your API keys.';
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      ...(process.env.NODE_ENV === 'development' && {
        error: error.message,
        stack: error.stack,
        details: error.toString(),
      }),
    });
  }
};

// @desc    Verify payment (Razorpay or Mock)
// @route   POST /api/checkout/verify-payment
// @access  Private
const verifyPayment = async (req, res) => {
  const client = await pool.connect();
  
  try {
    console.log('💳 Verifying payment for user:', req.user.id);
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

    // For mock payments, skip signature verification
    if (PAYMENT_MODE === 'mock') {
      console.log('🔍 Mock payment mode - checking order...');
      // Mock payment verification - always succeed
      // Just verify that the order exists and belongs to the user
      const orderCheck = await client.query(
        `SELECT id, user_id, total_price, status FROM orders 
         WHERE razorpay_order_id = $1 AND user_id = $2`,
        [razorpay_order_id, userId]
      );
      
      console.log('📦 Order check result:', orderCheck.rows.length > 0 ? 'Found' : 'Not found');

      if (orderCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Order not found.',
        });
      }

      const order = orderCheck.rows[0];

      // Get cart items for order creation
      console.log('🛒 Getting cart items for order items creation...');
      const cartResult = await client.query(
        `SELECT ci.*, p.price, p.name, p.stock_quantity
         FROM cart_items ci
         JOIN products p ON ci.product_id = p.id
         WHERE ci.user_id = $1`,
        [userId]
      );
      
      console.log(`📦 Found ${cartResult.rows.length} cart items to process`);

      // Create order items
      for (const item of cartResult.rows) {
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

      // Update order with payment info - auto-approve
      await client.query(
        `UPDATE orders 
         SET razorpay_payment_id = $1, 
             razorpay_signature = $2,
             status = 'processing'
         WHERE id = $3`,
        [razorpay_payment_id || 'mock_payment_' + Date.now(), 'mock_signature_' + Date.now(), order.id]
      );
      
      // Trigger automatic bill print
      try {
        const printerService = require('../services/printerService');
        console.log('🖨️ Attempting to print bill for order:', order.id);
        await printerService.printOrderBill(order.id);
        console.log('✅ Print completed or skipped');
      } catch (printError) {
        console.error('Failed to auto-print bill:', printError);
        // Don't fail the order if printing fails
      }

      // Clear user's cart
      await client.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);

      // Get user details for email notification
      const userResult = await client.query(
        'SELECT name, email FROM users WHERE id = $1',
        [userId]
      );
      const user = userResult.rows[0];

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

      // Send order confirmation email to customer
      try {
        const { sendEmail } = require('../utils/emailService');
        await sendEmail(
          user.email,
          'orderConfirmation',
          [user.name, order]
        );
      } catch (emailError) {
        console.error('Failed to send order confirmation email:', emailError);
        // Don't fail the request if email fails
      }

      // Get order with order_number
      const finalOrderResult = await pool.query(
        'SELECT id, order_number FROM orders WHERE id = $1',
        [order.id]
      );
      const finalOrder = finalOrderResult.rows[0];

      console.log('✅ Payment verified successfully for order:', order.id);

      res.json({
        success: true,
        message: 'Payment verified and order created successfully.',
        orderId: order.id,
        orderNumber: finalOrder?.order_number || order.order_number || `ORD-${order.id}`,
        order: {
          ...order,
          order_number: finalOrder?.order_number || order.order_number || `ORD-${order.id}`,
        },
      });

      return;
    }

    // Razorpay payment verification
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed. Missing payment details.',
      });
    }

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

    // Get order from database
    const orderResult = await client.query(
      `SELECT * FROM orders WHERE razorpay_order_id = $1 AND user_id = $2`,
      [razorpay_order_id, userId]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    const order = orderResult.rows[0];

    // Get cart items for order creation
    const cartResult = await client.query(
      `SELECT ci.*, p.price, p.name, p.stock_quantity
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = $1`,
      [userId]
    );

    // Create order items
    for (const item of cartResult.rows) {
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

    // Update order with payment info - auto-approve
    await client.query(
      `UPDATE orders 
       SET razorpay_payment_id = $1, 
           razorpay_signature = $2,
           status = 'processing'
       WHERE id = $3`,
      [razorpay_payment_id, razorpay_signature, order.id]
    );
    
    // Trigger automatic bill print
    try {
      const printerService = require('../services/printerService');
      await printerService.printOrderBill(order.id);
    } catch (printError) {
      console.error('Failed to auto-print bill:', printError);
      // Don't fail the order if printing fails
    }

    // Clear user's cart
    await client.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);

    // Get user details for email notification
    const userResult = await client.query(
      'SELECT name, email FROM users WHERE id = $1',
      [userId]
    );
    const user = userResult.rows[0];

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

    // Send order confirmation email to customer
    try {
      const { sendEmail } = require('../utils/emailService');
      await sendEmail(
        user.email,
        'orderConfirmation',
        [user.name, order]
      );
    } catch (emailError) {
      console.error('Failed to send order confirmation email:', emailError);
      // Don't fail the request if email fails
    }

    res.json({
      success: true,
      message: 'Payment verified and order created successfully.',
      orderId: order.id,
      order: order,
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
