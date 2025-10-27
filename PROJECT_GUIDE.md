# 🛍️ DressShop - Complete Project Guide

## 📑 Table of Contents
1. [Overview](#overview)
2. [Features](#features)
3. [Technology Stack](#technology-stack)
4. [Quick Start](#quick-start)
5. [Installation](#installation)
6. [Configuration](#configuration)
7. [Running the Application](#running-the-application)
8. [Login Credentials](#login-credentials)
9. [API Documentation](#api-documentation)
10. [Troubleshooting](#troubleshooting)

---

## Overview

DressShop is a modern, full-stack e-commerce platform for dress shopping with:
- **Role-based access control** (Customer, Manager, Admin)
- **Secure payment integration** with Razorpay
- **AI Support Chat** for customer assistance
- **Product Return System** with configurable return days
- **Order Approval Workflow** for managers
- **Beautiful mobile-responsive UI** built with Next.js and Tailwind CSS

---

## Features

### 🛒 Customer Features
- Browse and search products with advanced filtering
- Shopping cart with quantity management
- Secure checkout with Razorpay payment
- Order history and tracking
- Request product returns (within return period)
- AI support chat for assistance
- User profile management

### 📊 Manager/Admin Features
- Dashboard with analytics and statistics
- Product management (CRUD operations)
- Category management
- Order approval workflow
- Bill generation for approved orders
- Support ticket management
- Return request management
- User management (Admin only)

### 🆕 New Advanced Features
1. **AI Support Chat System**
   - Floating chat button for all users
   - Create and manage support tickets
   - Real-time responses from support team
   - Ticket priority and status tracking

2. **Product Return System**
   - Configurable return days per product
   - Automatic return eligibility checking
   - Return request workflow for managers
   - Return status tracking

3. **Order Approval System**
   - Managers receive notifications for new orders
   - Approve or reject orders
   - Automatic bill generation on approval
   - Bill includes delivery details

### 🔒 Security Features
- JWT authentication with secure token storage
- Password hashing with bcrypt (10 salt rounds)
- Rate limiting on authentication endpoints
- Razorpay signature verification
- SQL injection protection (parameterized queries)
- CORS configuration
- Role-based access control

---

## Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **HTTP Client**: Axios
- **UI Components**: Custom components with Tailwind

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL 14+
- **Authentication**: JWT + bcryptjs
- **Payment**: Razorpay
- **Security**: Helmet, CORS, Rate Limiting

---

## Quick Start

### Prerequisites
- Node.js 18+ ([Download](https://nodejs.org/))
- PostgreSQL 14+ ([Download](https://www.postgresql.org/download/))
- Razorpay account for test keys ([Sign up](https://razorpay.com/))

### Installation

**1. Clone the repository**
```bash
git clone <repository-url>
cd online-dress-shop
```

**2. Backend Setup**
```bash
cd server
npm install

# Copy environment file
copy env.example .env  # Windows
# OR
cp env.example .env    # Mac/Linux

# Edit .env with your database credentials
# Then initialize database
npm run db:init
npm run db:seed
```

**3. Frontend Setup**
```bash
cd client
npm install

# Create .env.local file
echo "NEXT_PUBLIC_API_URL=http://localhost:5000" > .env.local
echo "NEXT_PUBLIC_RAZORPAY_KEY_ID=your_key_id" >> .env.local
```

**4. Start Both Servers**
```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

**5. Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api

---

## Configuration

### Backend Environment Variables (`server/.env`)

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dress_shop
DB_USER=postgres
DB_PASSWORD=your_postgresql_password

# Authentication
JWT_SECRET=your_super_secret_key_change_this_in_production
JWT_EXPIRE=7d

# Payment
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxx

# CORS
CLIENT_URL=http://localhost:3000
```

### Frontend Environment Variables (`client/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
```

### Get Razorpay Test Keys
1. Sign up at [Razorpay](https://razorpay.com/)
2. Go to Settings → API Keys
3. Generate test keys (keep them safe!)

---

## Running the Application

### Development Mode

**Backend:**
```bash
cd server
npm run dev  # Runs with nodemon (auto-restart)
```

**Frontend:**
```bash
cd client
npm run dev  # Runs Next.js dev server
```

### Production Build

**Backend:**
```bash
cd server
npm start
```

**Frontend:**
```bash
cd client
npm run build
npm start
```

---

## Login Credentials

After running `npm run db:seed`, use these test accounts:

| Role     | Email                 | Password    | Access Level                                    |
|----------|-----------------------|-------------|-------------------------------------------------|
| Admin    | admin@example.com     | admin123    | Full access (all features + user management)   |
| Manager  | manager@example.com   | manager123  | Product management, orders, tickets, returns    |
| Customer | customer@example.com  | customer123  | Shopping, cart, orders, support, returns       |

### Seeded Data
- **Users**: 3 (Admin, Manager, Customer)
- **Categories**: 5 (Dresses, Tops, Bottoms, Accessories, Shoes)
- **Products**: 10 (with images, prices, and return policies)

---

## API Documentation

### Authentication Endpoints

**Register User**
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Login**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "admin123"
}
```

**Get Current User** (Protected)
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### Product Endpoints

```http
GET /api/products                    # List all products
GET /api/products?category=1         # Filter by category
GET /api/products?minPrice=50        # Filter by price
GET /api/products/:id                # Get single product
POST /api/products                   # Create product (Admin/Manager)
PUT /api/products/:id                # Update product (Admin/Manager)
DELETE /api/products/:id             # Delete product (Admin/Manager)
```

### Order Endpoints

```http
GET /api/orders                      # All orders (Admin/Manager)
GET /api/orders/my/list              # User's orders
GET /api/orders/pending-approval     # Pending approval (Manager)
PUT /api/orders/:id/approval         # Approve/reject order (Manager)
GET /api/orders/:id/bill             # Generate bill PDF
```

### Support Ticket Endpoints

```http
GET /api/support/tickets             # Get user's tickets
POST /api/support/tickets            # Create ticket
GET /api/support/tickets/:id         # Get ticket details
POST /api/support/tickets/:id/response  # Add response
PUT /api/support/tickets/:id         # Update ticket (Admin/Manager)
```

### Return Request Endpoints

```http
GET /api/returns                     # Get user's returns
POST /api/returns                    # Request return
PUT /api/returns/:id                 # Update return status (Manager)
```

### Complete API List

See full API documentation at: `/api/docs` (when running)

---

## Troubleshooting

### Backend Won't Start

**Error: "Cannot connect to database"**
```bash
# Check PostgreSQL is running
# Windows:
services.msc  # Look for postgresql service

# Mac:
brew services list

# Linux:
sudo systemctl status postgresql

# Test connection:
psql -U postgres -d dress_shop
```

**Error: "Port 5000 already in use"**
```bash
# Find and kill the process
# Windows:
netstat -ano | findstr :5000
taskkill /PID <process_id> /F

# Mac/Linux:
lsof -ti:5000 | xargs kill -9
```

**Error: "Module not found"**
```bash
cd server
rm -rf node_modules package-lock.json
npm install
```

### Frontend Issues

**Error: "Failed to fetch"**
- Check backend is running on port 5000
- Verify `NEXT_PUBLIC_API_URL` in `.env.local`
- Check browser console for CORS errors

**Error: "Module parse failed"**
```bash
cd client
rm -rf .next node_modules
npm install
npm run dev
```

**Styles not loading**
```bash
# Clear Next.js cache
cd client
rm -rf .next
npm run dev
```

### Database Issues

**Reset Database**
```bash
cd server
# Drop and recreate
dropdb dress_shop
createdb dress_shop
npm run db:init
npm run db:seed
```

**Check Database Tables**
```bash
psql -U postgres -d dress_shop
\dt  # List all tables
\d products  # Describe products table
```

### Payment Issues

**Razorpay checkout not appearing**
- Verify Razorpay keys are correct
- Check browser console for errors
- Ensure keys match in both `.env` files

**Payment verification fails**
- Check `RAZORPAY_KEY_SECRET` in backend `.env`
- Verify signature calculation logic
- Check Razorpay dashboard for payment status

---

## Project Structure

```
online-dress-shop/
├── server/                     # Backend (Node.js/Express)
│   ├── config/
│   │   ├── database.js        # PostgreSQL connection
│   │   └── razorpay.js        # Razorpay configuration
│   ├── controllers/           # Business logic
│   │   ├── authController.js
│   │   ├── productController.js
│   │   ├── orderController.js
│   │   ├── checkoutController.js
│   │   ├── supportController.js      # NEW
│   │   ├── returnController.js       # NEW
│   │   └── notificationController.js # NEW
│   ├── middleware/
│   │   ├── auth.js           # JWT verification
│   │   └── errorHandler.js   # Global error handler
│   ├── routes/               # API routes
│   ├── scripts/
│   │   ├── initDatabase.js   # Database schema
│   │   ├── addNewFeatures.js # New features migration
│   │   └── seedData.js       # Sample data
│   ├── .env                  # Environment variables
│   └── server.js             # Entry point
│
├── client/                    # Frontend (Next.js)
│   ├── app/                  # Next.js App Router
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── dashboard/        # Admin/Manager dashboard
│   │   │   ├── approvals/          # NEW
│   │   │   ├── support-tickets/    # NEW
│   │   │   └── return-requests/    # NEW
│   │   ├── products/
│   │   ├── cart/
│   │   ├── checkout/
│   │   ├── orders/
│   │   ├── returns/                # NEW
│   │   └── layout.tsx
│   ├── components/
│   │   ├── SupportChat.tsx         # NEW
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   └── ProductCard.tsx
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   └── CartContext.tsx
│   ├── lib/
│   │   ├── api.ts            # API client
│   │   └── types.ts          # TypeScript types
│   └── .env.local            # Environment variables
│
└── README.md
```

---

## Database Schema

### Main Tables

- `users` - User accounts with roles
- `categories` - Product categories
- `products` - Products with return_days
- `product_categories` - Many-to-many relationship
- `cart_items` - Shopping cart
- `orders` - Orders with approval_status
- `order_items` - Order line items
- `support_tickets` - Support tickets (NEW)
- `ticket_responses` - Ticket messages (NEW)
- `return_requests` - Return requests (NEW)
- `notifications` - User notifications (NEW)

---

## Support

For issues or questions:
1. Check this documentation
2. Review error messages carefully
3. Check browser console (F12) for frontend errors
4. Check terminal output for backend errors
5. Verify all environment variables are set correctly

---

**Happy Coding! 🚀**


