require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const checkoutRoutes = require('./routes/checkoutRoutes');
const userRoutes = require('./routes/userRoutes');
const supportRoutes = require('./routes/supportRoutes');
const returnRoutes = require('./routes/returnRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const addressRoutes = require('./routes/addressRoutes');
const printerRoutes = require('./routes/printerRoutes');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

// Import database connection (to test connection on startup)
const pool = require('./config/database');

// Initialize express app
const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
};
app.use(cors(corsOptions));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting for auth endpoints
// Only enabled in production, disabled in development
let authLimiter;
if (process.env.NODE_ENV === 'production') {
  authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 requests per 15 minutes in production
    message: 'Too many authentication attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
} else {
  // In development, create a middleware that does nothing (passes through)
  authLimiter = (req, res, next) => {
    next(); // Just pass through without any rate limiting
  };
  console.log('⚠️  Rate limiting DISABLED in development mode');
}

// Routes
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Sallapuradamma textiles API is running',
    version: '1.0.0',
  });
});

// Temporarily remove rate limiting to fix 403 errors
// app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/auth', authRoutes);
console.log('✅ Auth routes loaded WITHOUT rate limiting');
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/users', userRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/printers', printerRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

// Run migrations on startup
(async () => {
  try {
    console.log('🔄 Checking database migrations...');
    const addNewFeatures = require('./scripts/addNewFeatures');
    await addNewFeatures();
    console.log('✅ Database migrations complete');
  } catch (error) {
    console.error('⚠️  Error running migrations:', error.message);
    // Don't exit - let server start anyway
  }
})();

app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`📡 Server: http://localhost:${PORT}`);
  console.log(`🌐 API: http://localhost:${PORT}/api`);
  console.log('═══════════════════════════════════════════════');
  console.log('');
  console.log('📋 Available endpoints:');
  console.log('   POST   /api/auth/register');
  console.log('   POST   /api/auth/login');
  console.log('   GET    /api/auth/me');
  console.log('   GET    /api/auth/verify-email');
  console.log('   POST   /api/auth/resend-verification');
  console.log('   POST   /api/auth/forgot-password');
  console.log('   POST   /api/auth/reset-password');
  console.log('   GET    /api/products');
  console.log('   GET    /api/categories');
  console.log('   GET    /api/cart');
  console.log('   POST   /api/cart');
  console.log('   GET    /api/orders');
  console.log('   POST   /api/checkout/create-order');
  console.log('   POST   /api/checkout/verify-payment');
  console.log('   GET    /api/support/tickets');
  console.log('   GET    /api/returns');
  console.log('   GET    /api/notifications');
  console.log('');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  // Close server & exit process
  process.exit(1);
});
