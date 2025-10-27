# DressShop - Full-Stack Online Dress Shopping Portal

A modern, fully-featured e-commerce platform for dress shopping with role-based access control, secure payment integration, and a beautiful mobile-responsive UI.

## 🚀 Features

### Customer Features
- **Browse & Search**: Explore products with advanced filtering (category, price range, search)
- **Product Details**: Detailed product pages with image gallery and stock information
- **Shopping Cart**: Add to cart, update quantities, and manage items
- **Secure Checkout**: Razorpay payment integration with signature verification
- **Order History**: View past orders and track order status
- **User Profile**: Manage personal information and default address

### Admin/Manager Features
- **Dashboard Analytics**: Overview of orders, revenue, and sales statistics
- **Order Management**: View all orders, update order status (pending → processing → shipped → delivered)
- **Product Management**: Full CRUD operations for products with categories
- **Category Management**: Create and manage product categories
- **User Management** (Admin only): Manage user roles and permissions

### Security Features
- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with 10 salt rounds
- **Rate Limiting**: Protection against brute-force attacks on auth endpoints
- **Payment Verification**: Razorpay signature verification to prevent fraud
- **Role-Based Access Control**: Granular permissions (Customer, Manager, Admin)
- **SQL Injection Protection**: Parameterized queries with pg
- **CORS Configuration**: Secure cross-origin resource sharing

## 🛠 Technology Stack

### Frontend
- **Framework**: Next.js 14 (React 18)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (Mobile-first approach)
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Notifications**: React Hot Toast

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (jsonwebtoken) + bcryptjs
- **Payment Gateway**: Razorpay
- **Security**: Helmet, CORS, Express Rate Limit
- **Validation**: Express Validator

## 📁 Project Structure

```
online-dress-shop/
├── server/                 # Backend (Node.js/Express)
│   ├── config/            # Database & Razorpay configuration
│   ├── controllers/       # Route controllers
│   ├── middleware/        # Auth & error handling middleware
│   ├── routes/            # API routes
│   ├── scripts/           # Database initialization & seeding
│   └── server.js          # Entry point
│
├── client/                # Frontend (Next.js)
│   ├── app/              # Next.js app directory (pages)
│   ├── components/       # Reusable React components
│   ├── context/          # React Context providers
│   ├── lib/              # Utilities (API client, types)
│   └── public/           # Static assets
│
└── README.md
```

## 🚦 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- Razorpay account (for test keys)

> **📖 Complete Guide:** See [PROJECT_GUIDE.md](PROJECT_GUIDE.md) for detailed installation, setup, and usage instructions.

### 1. Clone the Repository
```bash
git clone <repository-url>
cd online-dress-shop
```

### 2. Backend Setup

#### Install Dependencies
```bash
cd server
npm install
```

#### Configure Environment Variables
Create a `.env` file in the `server` directory (copy from `env.example`):

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dress_shop
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your_strong_secret_key_here
JWT_EXPIRE=7d

# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_test_key_id
RAZORPAY_KEY_SECRET=your_razorpay_test_key_secret

# Frontend URL
CLIENT_URL=http://localhost:3000
```

#### Initialize Database
```bash
# Create the database
createdb dress_shop

# Run database initialization script
npm run db:init

# Seed sample data
npm run db:seed
```

#### Start Backend Server
```bash
npm run dev
# Server will run on http://localhost:5000
```

### 3. Frontend Setup

#### Install Dependencies
```bash
cd client
npm install
```

#### Configure Environment Variables
Create a `.env.local` file in the `client` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_test_key_id
```

#### Start Frontend Development Server
```bash
npm run dev
# Application will run on http://localhost:3000
```

## 👥 Test Accounts

After running the seed script, you can use these test accounts:

| Role     | Email                    | Password    |
|----------|--------------------------|-------------|
| Admin    | admin@dressshop.com      | admin123    |
| Manager  | manager@dressshop.com    | manager123  |
| Customer | customer@example.com     | customer123 |

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user (Protected)

### Products
- `GET /api/products` - Get all products (with filters)
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (Admin/Manager)
- `PUT /api/products/:id` - Update product (Admin/Manager)
- `DELETE /api/products/:id` - Delete product (Admin/Manager)

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category (Admin/Manager)
- `PUT /api/categories/:id` - Update category (Admin/Manager)
- `DELETE /api/categories/:id` - Delete category (Admin/Manager)

### Cart
- `GET /api/cart` - Get user's cart (Protected)
- `POST /api/cart` - Add item to cart (Protected)
- `PUT /api/cart/:id` - Update cart item (Protected)
- `DELETE /api/cart/:id` - Remove from cart (Protected)

### Orders
- `GET /api/orders` - Get all orders (Admin/Manager)
- `GET /api/orders/my/list` - Get user's orders (Protected)
- `GET /api/orders/:id` - Get single order (Protected)
- `PUT /api/orders/:id/status` - Update order status (Admin/Manager)
- `GET /api/orders/stats/summary` - Get order statistics (Admin/Manager)

### Checkout
- `POST /api/checkout/create-order` - Create Razorpay order (Protected)
- `POST /api/checkout/verify-payment` - Verify payment (Protected)

### Users
- `GET /api/users` - Get all users (Admin)
- `PUT /api/users/:id/role` - Update user role (Admin)
- `DELETE /api/users/:id` - Delete user (Admin)
- `PUT /api/users/profile` - Update own profile (Protected)

## 🔒 Role-Based Access Control

| Feature              | Customer | Manager | Admin |
|---------------------|----------|---------|-------|
| Browse Products     | ✅       | ✅      | ✅    |
| Place Orders        | ✅       | ✅      | ✅    |
| View Own Orders     | ✅       | ✅      | ✅    |
| Manage Products     | ❌       | ✅      | ✅    |
| Manage Categories   | ❌       | ✅      | ✅    |
| View All Orders     | ❌       | ✅      | ✅    |
| Update Order Status | ❌       | ✅      | ✅    |
| Manage Users        | ❌       | ❌      | ✅    |

## 💳 Payment Integration

The application uses **Razorpay** for secure payment processing:

1. **Test Mode**: Use test keys for development
2. **Payment Flow**:
   - User proceeds to checkout
   - Backend creates Razorpay order
   - Frontend displays Razorpay modal
   - User completes payment
   - Backend verifies payment signature (CRITICAL for security)
   - Order is confirmed and stock is deducted

### Test Cards
Use Razorpay test cards for testing:
- Card: 4111 1111 1111 1111
- CVV: Any 3 digits
- Expiry: Any future date

## 📱 Mobile Responsiveness

The application is built with a **mobile-first approach**:
- All pages are fully responsive
- Optimized for touch interactions
- Hamburger menu on mobile devices
- Responsive tables convert to cards on small screens
- Image optimization with Next.js Image component

## 🚀 Deployment

See [DEPLOY_AND_TROUBLESHOOT.md](DEPLOY_AND_TROUBLESHOOT.md) for:
- Deployment instructions (Render, Vercel, Railway, Heroku)
- Environment configuration
- Common issues and solutions
- Security checklist

## 📚 Documentation

- **[PROJECT_GUIDE.md](PROJECT_GUIDE.md)** - Complete installation, setup, and usage guide
- **[DEPLOY_AND_TROUBLESHOOT.md](DEPLOY_AND_TROUBLESHOOT.md)** - Deployment guide and troubleshooting
- **[ERROR_FIXES_APPLIED.md](ERROR_FIXES_APPLIED.md)** - Known issues and fixes log

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For support or issues:
1. Check [DEPLOY_AND_TROUBLESHOOT.md](DEPLOY_AND_TROUBLESHOOT.md)
2. Review [ERROR_FIXES_APPLIED.md](ERROR_FIXES_APPLIED.md)
3. Open an issue in the repository

---

**Built with ❤️ using the PERN stack**


