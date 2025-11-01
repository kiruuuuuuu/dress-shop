# 💳 Razorpay Test Keys Setup Guide

Follow these steps to get your Razorpay test keys and set up payment integration.

---

## 🔑 **Step 1: Create Razorpay Account**

1. **Visit**: https://razorpay.com/
2. **Click**: "Sign Up" (top right)
3. **Fill**: Your email, password, phone number
4. **Verify**: Check your email and verify your account

**Time**: 2-3 minutes

---

## 🧪 **Step 2: Get Test Keys**

### **Option A: Via Dashboard (Recommended)**

1. **Login**: Go to https://dashboard.razorpay.com/
2. **Mode**: Make sure you're in **Test Mode** (toggle at top right)
3. **Navigate**: Click **Settings** → **API Keys**
4. **Generate**: Click **"Generate Test Key"** button
5. **Copy**: 
   - **Key ID**: `rzp_test_xxxxxxxxxxxxx` (starts with `rzp_test_`)
   - **Key Secret**: `xxxxxxxxxxxxxxxxxxxxxxxx` (random string)

### **Option B: If Keys Already Exist**

1. **Login**: Go to https://dashboard.razorpay.com/
2. **Settings** → **API Keys**
3. **View**: Click "View Key" or "Reveal Key Secret"
4. **Copy**: Both Key ID and Key Secret

---

## 📝 **Step 3: Add Keys to Your Project**

### **Backend (.env file)**

**Location**: `server/.env`

**Create the file if it doesn't exist:**
```bash
cd server
copy env.example .env
```

**Add your keys:**
```env
# Razorpay Configuration (Test Keys)
RAZORPAY_KEY_ID=rzp_test_your_key_id_here
RAZORPAY_KEY_SECRET=your_key_secret_here
```

**Example:**
```env
RAZORPAY_KEY_ID=rzp_test_AbCdEfGhIjKlMn
RAZORPAY_KEY_SECRET=AbCdEfGhIjKlMnOpQrStUvWxYz123456
```

### **Frontend (.env.local file)**

**Location**: `client/.env.local`

**Create the file if it doesn't exist:**
```bash
cd client
copy env.local.example .env.local
```

**Add your Key ID (only Key ID needed for frontend):**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_your_key_id_here
```

**Example:**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_AbCdEfGhIjKlMn
```

---

## ⚠️ **Important Notes**

### **Security:**
- ✅ **NEVER** commit `.env` or `.env.local` files to Git
- ✅ **Test keys** are safe to use (can't process real payments)
- ✅ **Production keys** must be kept secret

### **Test Mode vs Live Mode:**
- **Test Mode**: Use test keys (`rzp_test_...`)
  - For development and testing
  - Cannot process real payments
  - Free to use
  
- **Live Mode**: Use production keys (`rzp_live_...`)
  - For actual payments
  - Requires business verification
  - Processes real money

---

## 🧪 **Step 4: Test with Test Cards**

Once keys are added, test with these **Razorpay test cards**:

### **Success Test Card:**
```
Card Number: 4111 1111 1111 1111
CVV: Any 3 digits (e.g., 123)
Expiry: Any future date (e.g., 12/25)
Name: Any name
```

### **Failure Test Card:**
```
Card Number: 4000 0000 0000 0002
CVV: Any 3 digits
Expiry: Any future date
```
(This will simulate a payment failure)

### **3D Secure Test Card:**
```
Card Number: 5267 3181 8797 5449
CVV: Any 3 digits
Expiry: Any future date
```
(This will show 3D Secure authentication)

---

## ✅ **Step 5: Verify Setup**

### **1. Restart Backend Server:**
```bash
cd server
npm start
```

### **2. Restart Frontend Server:**
```bash
cd client
npm run dev
```

### **3. Test Payment Flow:**
1. Add items to cart
2. Go to checkout
3. Enter shipping address
4. Click "Proceed to Payment"
5. Use test card: `4111 1111 1111 1111`
6. Complete payment

**If it works:** ✅ Payment successful!

**If it fails:** Check error messages in console.

---

## 🔄 **Switching to Production Keys**

When you're ready to deploy:

### **1. Complete KYC:**
- Login to Razorpay Dashboard
- Go to **Settings** → **Account & Settings**
- Complete business verification (KYC)
- Wait for approval (usually 1-2 days)

### **2. Switch to Live Mode:**
- Toggle from **Test Mode** to **Live Mode**
- Go to **Settings** → **API Keys**
- Copy **Live Key ID** (`rzp_live_...`)
- Copy **Live Key Secret**

### **3. Update Environment Variables:**
- **Backend**: Update `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in production `.env`
- **Frontend**: Update `NEXT_PUBLIC_RAZORPAY_KEY_ID` in production `.env.local`

### **4. Redeploy:**
- Deploy with new production keys
- Test with a small real transaction first

---

## 📚 **Quick Reference**

### **Test Keys Format:**
- **Key ID**: `rzp_test_` + 20 characters
- **Key Secret**: 40 random characters

### **Live Keys Format:**
- **Key ID**: `rzp_live_` + 20 characters  
- **Key Secret**: 40 random characters

### **Test Cards:**
- **Success**: `4111 1111 1111 1111`
- **Failure**: `4000 0000 0000 0002`
- **3D Secure**: `5267 3181 8797 5449`

---

## 🆘 **Troubleshooting**

### **Error: "Invalid API key"**
- ✅ Check if keys are correctly copied (no extra spaces)
- ✅ Verify you're using Test keys in Test Mode
- ✅ Make sure keys start with `rzp_test_`

### **Error: "Payment failed"**
- ✅ Use test cards listed above
- ✅ Check expiry date is in the future
- ✅ CVV can be any 3 digits

### **Error: "Razorpay not configured"**
- ✅ Check `.env` file exists in `server/` directory
- ✅ Verify `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are set
- ✅ Restart your backend server after adding keys

### **Keys Not Working?**
1. Generate new test keys from dashboard
2. Make sure you copied both Key ID and Key Secret
3. Restart both backend and frontend servers
4. Clear browser cache and try again

---

## 📖 **Razorpay Documentation**

- **Dashboard**: https://dashboard.razorpay.com/
- **Test Keys**: https://razorpay.com/docs/payments/server-integration/test-payments/
- **Test Cards**: https://razorpay.com/docs/payments/server-integration/test-cards/
- **API Docs**: https://razorpay.com/docs/api/

---

## ✨ **Summary**

1. ✅ Create Razorpay account
2. ✅ Get test keys from dashboard
3. ✅ Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to `server/.env`
4. ✅ Add `NEXT_PUBLIC_RAZORPAY_KEY_ID` to `client/.env.local`
5. ✅ Restart servers
6. ✅ Test with test card: `4111 1111 1111 1111`

**That's it!** Your payment integration is ready for testing! 🎉

---

**Note**: For production deployment, you'll need to:
1. Complete KYC verification
2. Switch to Live Mode
3. Get production keys
4. Update environment variables in your hosting platform

