# 📝 How to Add PAYMENT_MODE=mock to Your .env File

## 📍 **Location:**
Add it to: **`server/.env`** file

## ✅ **Where to Place It:**
Place it **after the JWT configuration** and **before the Razorpay keys**.

## 📋 **Example Structure:**
Your `server/.env` file should look like this:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dress_shop
DB_USER=postgres
DB_PASSWORD=your_password_here

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here_change_in_production
JWT_EXPIRE=7d

# Payment Mode: 'razorpay' or 'mock'
# Use 'mock' for development/testing (no signup required, no real payments)
# Use 'razorpay' for production (requires Razorpay account and keys)
PAYMENT_MODE=mock

# Razorpay Configuration (Test Keys)
# Only needed if PAYMENT_MODE=razorpay
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret

# Frontend URL (for CORS)
CLIENT_URL=http://localhost:3000

# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password_here
EMAIL_FROM="Sallapuradamma textiles" <noreply@sallapuradammatextiles.com>
```

## 🎯 **Exact Location:**
Add these lines **right after** `JWT_EXPIRE=7d`:

```env
# Payment Mode: 'razorpay' or 'mock'
# Use 'mock' for development/testing (no signup required, no real payments)
# Use 'razorpay' for production (requires Razorpay account and keys)
PAYMENT_MODE=mock
```

## 📝 **Quick Steps:**

1. **Open** `server/.env` file in your editor
2. **Find** the line `JWT_EXPIRE=7d`
3. **Add** after it (with a blank line):
   ```env
   
   # Payment Mode: 'razorpay' or 'mock'
   PAYMENT_MODE=mock
   ```
4. **Save** the file
5. **Restart** your backend server

## ⚠️ **Important:**
- Make sure there are **no spaces** around the `=` sign
- Use `mock` for testing (no Razorpay needed)
- Use `razorpay` when you want real payments

## ✅ **After Adding:**
Restart your backend server:
```bash
cd server
npm start
```

Then test checkout - it should work with mock payment!

