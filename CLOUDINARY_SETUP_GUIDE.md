# Cloudinary Setup Guide

## What is Cloudinary?

Cloudinary is a cloud-based image and video management service that provides:
- Cloud storage for your images
- Automatic image optimization and compression
- CDN (Content Delivery Network) for fast image delivery worldwide
- Image transformations (resize, crop, etc.)

## Getting Your Cloudinary API Keys

### Step 1: Sign Up for a Free Account

1. Go to **https://cloudinary.com/**
2. Click **"Get Started for Free"** or **"Sign Up"**
3. Fill in your details:
   - Email address
   - Password
   - Company name (optional)
4. Click **"Create Account"**

### Step 2: Verify Your Email

- Check your email inbox
- Click the verification link from Cloudinary
- You'll be redirected to your dashboard

### Step 3: Find Your API Keys

1. Once logged in, click on the **Settings** icon (⚙️) in the left sidebar
2. Scroll down to find **"Product environment credentials"** or **"API Keys"** section
3. You'll see three important values:

```
Cloud Name: your_cloud_name
API Key: 123456789012345
API Secret: 1234567890abcdefghijklmnopqrstuvwxyz
```

### Step 4: Copy Your Credentials

**⚠️ Important**: 
- **Cloud Name** and **API Key** can be used in frontend code
- **API Secret** must NEVER be exposed in frontend code - only in backend `.env` files

## Configuring in Your Project

### Backend Configuration

**File**: `server/.env` (create this file if it doesn't exist)

Add your Cloudinary credentials:

```bash
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

**Example**:
```bash
CLOUDINARY_CLOUD_NAME=my_sallapuradamma_shop
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abc123def456ghi789jkl012mno345pqr678stu901vwx234
```

### Environment File Template

Your `server/env.example` already has the placeholders. Copy it to create your `.env`:

**Windows PowerShell**:
```powershell
cd server
Copy-Item env.example .env
```

**Then edit `server/.env`** and replace the placeholder values with your actual credentials.

### Verification

After adding credentials:

1. **Restart your server**:
   ```powershell
   npm start
   ```

2. **Test the upload**:
   - Go to Dashboard → Products → Add New
   - Select an image file
   - Submit the form
   - Check the console logs for any Cloudinary errors

## Cloudinary Free Plan Limits

The free tier includes:

✅ **25 GB storage**  
✅ **25 GB bandwidth per month**  
✅ **Unlimited transformations**  
✅ **Up to 7,500,000 transformations per month**

This is more than enough for development and small to medium businesses!

## Security Best Practices

1. **Never commit `.env` files to Git**
   - Already configured in `.gitignore`
   - Only commit `env.example` with placeholder values

2. **API Secret Safety**
   - Only use in backend code
   - Never expose in frontend/client code
   - Rotate if accidentally exposed

3. **Production Setup**
   - Use different Cloudinary credentials for production
   - Set up environment variables in your hosting platform
   - Consider using environment-specific folders in Cloudinary

## Troubleshooting

### Error: "Invalid Cloud Name"

- Double-check your cloud name spelling
- Make sure there are no extra spaces
- Cloud names are case-sensitive

### Error: "Invalid API Key"

- Verify your API key is correct
- Ensure no spaces before/after the value
- The API key should be all numbers

### Error: "Invalid API Secret"

- Check that the API secret is the complete string
- Try revealing it again in the Cloudinary dashboard
- Make sure you copied the entire secret (it's long!)

### Images Not Uploading

1. Check server console for Cloudinary errors
2. Verify `.env` file is in the correct location (`server/.env`)
3. Restart the server after changing `.env`
4. Check Cloudinary dashboard for upload logs

## Additional Resources

- **Dashboard**: https://console.cloudinary.com/
- **Documentation**: https://cloudinary.com/documentation
- **API Reference**: https://cloudinary.com/documentation/image_upload_api_reference

## Quick Test

After setup, you can test Cloudinary is working by:

1. Creating a product with an image
2. Checking the product in your dashboard
3. Viewing the Cloudinary URL in the product data
4. Images should load quickly from Cloudinary's CDN

---

**Need Help?** Check Cloudinary's official documentation or contact their support for assistance.
