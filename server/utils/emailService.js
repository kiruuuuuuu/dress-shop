const nodemailer = require('nodemailer');

// Create reusable transporter
const createTransporter = () => {
  // For production, use a real email service (SendGrid, Resend, etc.)
  // For development/testing, you can use Gmail SMTP or a service like Ethereal Email
  
  // Option 1: Gmail SMTP (for testing)
  if (process.env.EMAIL_SERVICE === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD, // Use App Password, not regular password
      },
    });
  }

  // Option 2: SendGrid
  if (process.env.EMAIL_SERVICE === 'sendgrid') {
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY,
      },
    });
  }

  // Option 3: Resend
  if (process.env.EMAIL_SERVICE === 'resend') {
    return nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 587,
      secure: false,
      auth: {
        user: 'resend',
        pass: process.env.RESEND_API_KEY,
      },
    });
  }

  // Option 4: Generic SMTP
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  // Default: Use Ethereal Email for testing (doesn't send real emails)
  // This is perfect for development
  console.warn('⚠️  No email service configured. Using Ethereal Email test account.');
  return nodemailer.createTransporter({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: 'test@ethereal.email',
      pass: 'test',
    },
  });
};

// Email templates
const emailTemplates = {
  verification: (name, verificationLink) => ({
    subject: 'Verify Your Email - Sallapuradamma textiles',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background-color: #f9fafb; }
          .button { display: inline-block; padding: 12px 30px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Sallapuradamma textiles!</h1>
          </div>
          <div class="content">
            <p>Hi ${name},</p>
            <p>Thank you for registering with Sallapuradamma textiles. Please verify your email address by clicking the button below:</p>
            <p style="text-align: center;">
              <a href="${verificationLink}" class="button">Verify Email Address</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #4F46E5;">${verificationLink}</p>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create an account with Sallapuradamma textiles, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Sallapuradamma textiles. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Welcome to Sallapuradamma textiles!
      
      Hi ${name},
      
      Thank you for registering with Sallapuradamma textiles. Please verify your email address by visiting:
      
      ${verificationLink}
      
      This link will expire in 24 hours.
      
      If you didn't create an account with Sallapuradamma textiles, please ignore this email.
      
      © ${new Date().getFullYear()} Sallapuradamma textiles. All rights reserved.
    `,
  }),

  passwordReset: (name, resetLink) => ({
    subject: 'Reset Your Password - Sallapuradamma textiles',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #DC2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background-color: #f9fafb; }
          .button { display: inline-block; padding: 12px 30px; background-color: #DC2626; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .warning { background-color: #FEF3C7; padding: 15px; border-left: 4px solid #F59E0B; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hi ${name},</p>
            <p>We received a request to reset your password for your Sallapuradamma textiles account.</p>
            <p style="text-align: center;">
              <a href="${resetLink}" class="button">Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #DC2626;">${resetLink}</p>
            <p>This link will expire in 1 hour.</p>
            <div class="warning">
              <strong>⚠️ Security Notice:</strong> If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Sallapuradamma textiles. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Password Reset Request
      
      Hi ${name},
      
      We received a request to reset your password for your Sallapuradamma textiles account.
      
      Reset your password by visiting:
      ${resetLink}
      
      This link will expire in 1 hour.
      
      ⚠️ Security Notice: If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
      
      © ${new Date().getFullYear()} Sallapuradamma textiles. All rights reserved.
    `,
  }),

  orderConfirmation: (name, order) => ({
    subject: `Order Confirmed - Order #${order.id} - Sallapuradamma textiles`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #10B981; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background-color: #f9fafb; }
          .order-info { background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .total { font-size: 18px; font-weight: bold; color: #10B981; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Confirmed!</h1>
          </div>
          <div class="content">
            <p>Hi ${name},</p>
            <p>Thank you for your order! We've received your payment and your order is being processed.</p>
            <div class="order-info">
              <h3>Order Details</h3>
              <p><strong>Order ID:</strong> #${order.id}</p>
              <p><strong>Order Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
              <p><strong>Total Amount:</strong> <span class="total">₹${parseFloat(order.total_price).toFixed(2)}</span></p>
              <p><strong>Status:</strong> ${order.status}</p>
              <p><strong>Shipping Address:</strong> ${order.shipping_address}</p>
            </div>
            <p>You can track your order status in your account dashboard.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Sallapuradamma textiles. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Order Confirmed!
      
      Hi ${name},
      
      Thank you for your order! We've received your payment and your order is being processed.
      
      Order Details:
      - Order ID: #${order.id}
      - Order Date: ${new Date(order.created_at).toLocaleDateString()}
      - Total Amount: ₹${parseFloat(order.total_price).toFixed(2)}
      - Status: ${order.status}
      - Shipping Address: ${order.shipping_address}
      
      You can track your order status in your account dashboard.
      
      © ${new Date().getFullYear()} Sallapuradamma textiles. All rights reserved.
    `,
  }),

  orderStatusUpdate: (name, order) => ({
    subject: `Order Status Update - Order #${order.id} - Sallapuradamma textiles`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #3B82F6; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background-color: #f9fafb; }
          .order-info { background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px; }
          .status { display: inline-block; padding: 8px 16px; background-color: #3B82F6; color: white; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Status Update</h1>
          </div>
          <div class="content">
            <p>Hi ${name},</p>
            <p>Your order status has been updated:</p>
            <div class="order-info">
              <p><strong>Order ID:</strong> #${order.id}</p>
              <p><strong>New Status:</strong> <span class="status">${order.status}</span></p>
            </div>
            <p>You can view your order details in your account dashboard.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Sallapuradamma textiles. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Order Status Update
      
      Hi ${name},
      
      Your order status has been updated:
      
      Order ID: #${order.id}
      New Status: ${order.status}
      
      You can view your order details in your account dashboard.
      
      © ${new Date().getFullYear()} Sallapuradamma textiles. All rights reserved.
    `,
  }),
};

// Send email function
const sendEmail = async (to, templateName, data) => {
  try {
    const transporter = createTransporter();
    const template = emailTemplates[templateName];

    if (!template) {
      throw new Error(`Email template "${templateName}" not found`);
    }

    const emailContent = typeof template === 'function' 
      ? template(...data) 
      : template(...data);

    const mailOptions = {
      from: process.env.EMAIL_FROM || `"Sallapuradamma textiles" <${process.env.EMAIL_USER || 'noreply@sallapuradammatextiles.com'}>`,
      to,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    };

    const info = await transporter.sendMail(mailOptions);
    
    // In development with Ethereal Email, log the preview URL
    if (process.env.EMAIL_SERVICE === undefined && info.messageId) {
      console.log('📧 Email sent! Preview URL: ' + nodemailer.getTestMessageUrl(info));
    }

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending error:', error);
    // Don't throw error in production - log it but don't break the flow
    if (process.env.NODE_ENV === 'development') {
      throw error;
    }
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendEmail,
  emailTemplates,
};

