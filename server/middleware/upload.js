const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// Check if Cloudinary is configured
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('⚠️  WARNING: Cloudinary credentials not configured!');
  console.error('   Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env');
  console.error('   Image uploads will fail without proper credentials.');
} else {
  console.log('✅ Cloudinary configured:', process.env.CLOUDINARY_CLOUD_NAME);
}

// Configure Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'sallapuradamma-textiles/products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 800, height: 800, crop: 'limit' },
      { quality: 'auto' },
      { format: 'auto' }
    ]
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  },
  fileFilter: (req, file, cb) => {
    console.log('📤 File upload attempted:', file.originalname, file.mimetype);
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      console.log('✅ File type accepted, proceeding with upload...');
      cb(null, true);
    } else {
      console.log('❌ File type rejected');
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
    }
  }
});

// Add error handling wrapper
const uploadWithErrorHandling = (fieldName) => {
  const uploadSingle = upload.single(fieldName);
  
  return (req, res, next) => {
    console.log(`🔵 Starting upload for field: ${fieldName}`);
    const startTime = Date.now();
    
    uploadSingle(req, res, (err) => {
      const duration = Date.now() - startTime;
      console.log(`⏱️  Upload callback after ${duration}ms`);
      
      if (err) {
        console.error('❌ Upload error:', err.message);
        console.error('   Stack:', err.stack);
        return res.status(400).json({
          success: false,
          message: err.message || 'File upload failed'
        });
      }
      if (req.file) {
        console.log('✅ File uploaded successfully:', req.file.originalname);
        console.log('   Path:', req.file.path);
        console.log('   Full file object:', JSON.stringify(req.file, null, 2));
      } else {
        console.log('⚠️  No file in req.file after upload');
      }
      console.log('✅ Upload middleware completed, calling next()');
      next();
    });
  };
};

module.exports = upload;
module.exports.withErrorHandling = uploadWithErrorHandling;
