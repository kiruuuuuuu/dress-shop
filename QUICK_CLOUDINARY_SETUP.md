# Quick Cloudinary Setup

## Get Your Credentials

1. **Sign up**: https://cloudinary.com → "Get Started for Free"
2. **Get keys**: Settings → API Keys → Copy Cloud Name, API Key, and API Secret

## Add to Backend

Create/edit `server/.env`:

```bash
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

**Example** (replace with your actual values):
```bash
CLOUDINARY_CLOUD_NAME=d_abc123xyz
CLOUDINARY_API_KEY=123456789012
CLOUDINARY_API_SECRET=AbCdEf1234567890GhIjKlMnOpQrStUvWxYz
```

## Start Your Server

```bash
cd server
npm start
```

## Test It

1. Go to Dashboard → Products → Add New
2. Select an image
3. Click "Create Product"
4. Image should upload to Cloudinary and display ✅

## Free Plan Includes

- ✅ 25 GB storage
- ✅ 25 GB bandwidth/month
- ✅ Unlimited transformations
- ✅ Perfect for development!

---

📖 **Full guide**: See `CLOUDINARY_SETUP_GUIDE.md` for detailed instructions.
