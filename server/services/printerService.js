const pool = require('../config/database');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// @desc    Print bill for an order with tracking and retry logic
// @param   {number} orderId - Order ID
// @param   {boolean} isRetry - Whether this is a retry attempt
const printOrderBill = async (orderId, isRetry = false) => {
  const client = await pool.connect();
  let pdfPath = null;
  
  try {
    await client.query('BEGIN');
    
    // Get default printer for admins/managers
    const printerResult = await client.query(
      `SELECT ps.* 
       FROM printer_settings ps
       JOIN users u ON ps.user_id = u.id
       WHERE ps.is_default = TRUE 
       AND u.role IN ('admin', 'manager')
       LIMIT 1`
    );

    if (printerResult.rows.length === 0) {
      console.log('No default printer configured. Skipping auto-print.');
      // Skip print status update if column doesn't exist
      try {
        await client.query(
          `UPDATE orders SET print_status = 'pending' WHERE id = $1`,
          [orderId]
        );
      } catch (dbError) {
        // Column might not exist yet - ignore error
        console.log('Print status column not found, skipping update');
      }
      await client.query('COMMIT');
      client.release();
      return;
    }

    const printer = printerResult.rows[0];
    console.log(`Printing order #${orderId} to printer: ${printer.printer_name}`);

    // Update print status to 'printing'
    try {
      await client.query(
        `UPDATE orders SET print_status = 'printing' WHERE id = $1`,
        [orderId]
      );
    } catch (dbError) {
      console.log('Print status column not found, continuing...');
    }

    // Generate PDF bill
    pdfPath = await generateBillPDF(orderId);
    
    // Send to printer
    await sendToPrinter(pdfPath, printer);
    
    // Clean up temp file
    if (pdfPath && fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath);
    }
    
    // Record successful print in history
    try {
      await client.query(
        `INSERT INTO print_history (order_id, status, printer_name, printer_ip)
         VALUES ($1, 'completed', $2, $3)`,
        [orderId, printer.printer_name, printer.printer_ip]
      );
    } catch (dbError) {
      console.log('Print history table not found, skipping...');
    }
    
    // Update order print status
    try {
      await client.query(
        `UPDATE orders SET print_status = 'completed', printed_at = CURRENT_TIMESTAMP, print_error = NULL WHERE id = $1`,
        [orderId]
      );
    } catch (dbError) {
      console.log('Print status columns not found, skipping...');
    }
    
    await client.query('COMMIT');
    console.log(`✅ Successfully printed order #${orderId}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error printing bill:', error.message);
    
    // Record failed print in history
    try {
      const printerResult = await client.query(
        `SELECT ps.* 
         FROM printer_settings ps
         JOIN users u ON ps.user_id = u.id
         WHERE ps.is_default = TRUE 
         AND u.role IN ('admin', 'manager')
         LIMIT 1`
      );
      
      if (printerResult.rows.length > 0) {
        const printer = printerResult.rows[0];
        try {
          await client.query(
            `INSERT INTO print_history (order_id, status, error_message, printer_name, printer_ip)
             VALUES ($1, 'failed', $2, $3, $4)`,
            [orderId, error.message, printer.printer_name, printer.printer_ip]
          );
        } catch (dbError) {
          console.log('Print history table not found, skipping history...');
        }
      }
      
      // Update order print status
      try {
        await client.query(
          `UPDATE orders SET print_status = 'failed', print_error = $1 WHERE id = $2`,
          [error.message, orderId]
        );
      } catch (dbError) {
        console.log('Print status columns not found, skipping update...');
      }
    } catch (dbError) {
      console.error('Error updating print status:', dbError);
    }
    
    // Clean up temp file if it exists
    if (pdfPath && fs.existsSync(pdfPath)) {
      try {
        fs.unlinkSync(pdfPath);
      } catch (unlinkError) {
        console.error('Error cleaning up temp file:', unlinkError);
      }
    }
    
    throw error;
  } finally {
    client.release();
  }
};

// @desc    Generate PDF bill
// @param   {number} orderId - Order ID
const generateBillPDF = async (orderId) => {
  return new Promise((resolve, reject) => {
    (async () => {
      try {
        console.log('📄 Generating PDF for order:', orderId);
        // Get order details
        const orderResult = await pool.query(`
          SELECT o.*, u.name as customer_name, u.email as customer_email, u.mobile_number as customer_mobile
          FROM orders o
          LEFT JOIN users u ON o.user_id = u.id
          WHERE o.id = $1
        `, [orderId]);

        if (orderResult.rows.length === 0) {
          reject(new Error('Order not found'));
          return;
        }

        const order = orderResult.rows[0];

        // Get order items with product codes
        const itemsResult = await pool.query(`
          SELECT oi.*, p.name as product_name, p.product_code
          FROM order_items oi
          LEFT JOIN products p ON oi.product_id = p.id
          WHERE oi.order_id = $1
        `, [orderId]);

        // Company details
        const companyName = 'Sallapuradamma textiles';
        const companyAddress = {
          line1: '123 Textile Street',
          line2: 'Karnataka, India',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560001',
          mobile: '+91 9876543210',
          email: 'info@sallapuradammatextiles.com'
        };

        // Create PDF
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const filename = `order-${orderId}-${Date.now()}.pdf`;
        const pdfPath = path.join(__dirname, '..', 'temp', filename);
        
        // Ensure temp directory exists
        const tempDir = path.join(__dirname, '..', 'temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        doc.pipe(fs.createWriteStream(pdfPath));

        // Header
        doc.fontSize(24).text(companyName, { align: 'center' });
        doc.fontSize(12).text('Invoice', { align: 'center' });
        doc.moveDown();

        // Order info
        doc.fontSize(10);
        doc.text(`Order Number: ${order.order_number || `ORD-${order.id}`}`, { align: 'left' });
        doc.text(`Date: ${new Date(order.created_at).toLocaleDateString()}`, { align: 'right' });
        doc.moveDown();

        // From/To Addresses
        doc.text('FROM:', { underline: true });
        doc.text(companyAddress.line1);
        doc.text(companyAddress.line2);
        doc.text(`${companyAddress.city}, ${companyAddress.state} - ${companyAddress.pincode}`);
        doc.text(`Phone: ${companyAddress.mobile}`);
        doc.moveDown();

        doc.text('SHIP TO:', { underline: true });
        // Parse shipping address from the text field
        const shippingLines = (order.shipping_address || '').split('\n');
        shippingLines.forEach(line => {
          if (line.trim()) doc.text(line);
        });
        doc.moveDown();

        // Payment info
        doc.text(`Payment ID: ${order.razorpay_payment_id || 'N/A'}`, { align: 'right' });
        doc.moveDown();

        // Items table
        const tableTop = doc.y;
        const itemHeight = 20;
        let position = tableTop;

        // Table headers
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Item', 50, position);
        doc.text('Code', 200, position);
        doc.text('Qty', 300, position);
        doc.text('Price', 360, position);
        doc.text('Total', 450, position);

        position += itemHeight;
        doc.moveTo(50, position).lineTo(550, position).stroke();
        doc.font('Helvetica');

        // Items
        itemsResult.rows.forEach((item) => {
          if (position + itemHeight > 650) {
            doc.addPage();
            position = 50;
          }
          
          doc.fontSize(9);
          doc.text(item.product_name || 'Unknown Product', 50, position);
          doc.text(item.product_code || 'N/A', 200, position);
          doc.text(item.quantity.toString(), 300, position);
          doc.text(`₹${parseFloat(item.price_at_purchase).toFixed(2)}`, 360, position);
          doc.text(`₹${(parseFloat(item.price_at_purchase) * item.quantity).toFixed(2)}`, 450, position);
          
          position += itemHeight;
        });

        // Total
        position += 10;
        doc.moveTo(50, position).lineTo(550, position).stroke();
        position += 10;
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text(`Total: ₹${parseFloat(order.total_price).toFixed(2)}`, 400, position);
        doc.font('Helvetica');

        // Footer
        doc.fontSize(8).text('Thank you for your business!', { align: 'center' });

        doc.end();

        // Wait for PDF to be generated
        doc.on('end', () => {
          console.log('✅ PDF generated successfully:', pdfPath);
          resolve(pdfPath);
        });

        doc.on('error', (err) => {
          console.error('PDF generation error:', err);
          reject(err);
        });

      } catch (error) {
        console.error('Error generating PDF:', error);
        reject(error);
      }
    })();
  });
};

// @desc    Send PDF to printer
// @param   {string} pdfPath - Path to PDF file
// @param   {object} printer - Printer configuration
const sendToPrinter = async (pdfPath, printer) => {
  return new Promise((resolve, reject) => {
    // For network printers, use IPP (Internet Printing Protocol) or system print command
    // This is a basic implementation - in production, use proper printing library
    
    if (printer.printer_ip && printer.connection_type === 'wifi') {
      // Network printer - would use IPP or similar protocol
      console.log(`Sending to network printer: ${printer.printer_ip}`);
      // TODO: Implement actual network printing
      resolve();
    } else {
      // Use system print command
      const { exec } = require('child_process');
      const command = `lp -d "${printer.printer_name}" "${pdfPath}"`;
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error('Print error:', error);
          reject(error);
        } else {
          console.log('Print job sent successfully');
          resolve();
        }
      });
    }
  });
};

// @desc    Get bill PDF as buffer for download
// @param   {number} orderId - Order ID
const getBillAsPDF = async (orderId) => {
  try {
    const pdfPath = await generateBillPDF(orderId);
    const pdfBuffer = fs.readFileSync(pdfPath);
    fs.unlinkSync(pdfPath);
    return pdfBuffer;
  } catch (error) {
    throw error;
  }
};

// @desc    Get print history for an order
// @param   {number} orderId - Order ID
const getPrintHistory = async (orderId) => {
  try {
    const result = await pool.query(
      `SELECT * FROM print_history WHERE order_id = $1 ORDER BY created_at DESC`,
      [orderId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching print history:', error);
    throw error;
  }
};

module.exports = {
  printOrderBill,
  generateBillPDF,
  sendToPrinter,
  getBillAsPDF,
  getPrintHistory,
};
