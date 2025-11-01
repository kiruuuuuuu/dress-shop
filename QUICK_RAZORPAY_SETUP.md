# ⚡ Quick Razorpay Setup (5 Minutes)

## 🚀 **Get Your Test Keys in 5 Minutes:**

1. **Sign Up**: https://razorpay.com/
2. **Login**: https://dashboard.razorpay.com/
3. **Make sure**: You're in **Test Mode** (toggle at top)
4. **Go to**: Settings → API Keys
5. **Click**: "Generate Test Key" (if needed)
6. **Copy**:
   - **Key ID**: `rzp_test_xxxxxxxxxxxxx`
   - **Key Secret**: `xxxxxxxxxxxxxxxxxxxxxx`

---

## 📝 **Add to Your Project:**

### **Backend** (`server/.env`):
```env
RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID_HERE
RAZORPAY_KEY_SECRET=YOUR_KEY_SECRET_HERE
```

### **Frontend** (`client/.env.local`):
```env
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID_HERE
```

---

## 🧪 **Test Cards:**

### **Success Card:**
```
Card: 4111 1111 1111 1111
CVV: 123 (or any 3 digits)
Expiry: 12/25 (or any future date)
```

### **Failure Card:**
```
Card: 4000 0000 0000 0002
CVV: 123
Expiry: 12/25
```

---

## ✅ **After Adding Keys:**

1. **Restart Backend**: `cd server && npm start`
2. **Restart Frontend**: `cd client && npm run dev`
3. **Test Checkout** with test card above

---

## 🔄 **For Production (Later):**

1. Complete KYC in Razorpay Dashboard
2. Switch to **Live Mode**
3. Get **Live Keys** (start with `rzp_live_...`)
4. Update keys in production `.env` files

---

**That's it!** 🎉


