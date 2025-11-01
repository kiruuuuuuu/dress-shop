# DressShop API Server

Backend API for the DressShop e-commerce platform.

## 🚀 Quick Start

### Install Dependencies
```bash
npm install
```

### Configure Environment
Copy `env.example` and create `.env`:
```bash
cp env.example .env
```

Edit `.env` with your configuration.

### Initialize Database
```bash
# Create database
createdb dress_shop

# Run initialization script
npm run db:init

# Seed sample data
npm run db:seed
```

### Start Server
```bash
# Development (with nodemon)
npm run dev

# Production
npm start
```

## 📡 API Endpoints

### Authentication (Public)
| Method | Endpoint            | Description           |
|--------|--------------------|-----------------------|
| POST   | /api/auth/register | Register new user     |
| POST   | /api/auth/login    | User login            |
| GET    | /api/auth/me       | Get current user      |

### Products
| Method | Endpoint           | Access        | Description           |
|--------|-------------------|---------------|-----------------------|
| GET    | /api/products     | Public        | Get all products      |
| GET    | /api/products/:id | Public        | Get single product    |
| POST   | /api/products     | Admin/Manager | Create product        |
| PUT    | /api/products/:id | Admin/Manager | Update product        |
| DELETE | /api/products/:id | Admin/Manager | Delete product        |

### Categories
| Method | Endpoint              | Access        | Description          |
|--------|----------------------|---------------|----------------------|
| GET    | /api/categories      | Public        | Get all categories   |
| GET    | /api/categories/:id  | Public        | Get single category  |
| POST   | /api/categories      | Admin/Manager | Create category      |
| PUT    | /api/categories/:id  | Admin/Manager | Update category      |
| DELETE | /api/categories/:id  | Admin/Manager | Delete category      |

### Cart
| Method | Endpoint         | Access    | Description              |
|--------|-----------------|-----------|--------------------------|
| GET    | /api/cart       | Protected | Get user's cart          |
| POST   | /api/cart       | Protected | Add item to cart         |
| PUT    | /api/cart/:id   | Protected | Update cart item         |
| DELETE | /api/cart/:id   | Protected | Remove item from cart    |
| DELETE | /api/cart       | Protected | Clear entire cart        |

### Orders
| Method | Endpoint                  | Access        | Description             |
|--------|--------------------------|---------------|-------------------------|
| GET    | /api/orders              | Admin/Manager | Get all orders          |
| GET    | /api/orders/my/list      | Protected     | Get user's orders       |
| GET    | /api/orders/:id          | Protected     | Get single order        |
| PUT    | /api/orders/:id/status   | Admin/Manager | Update order status     |
| GET    | /api/orders/stats/summary| Admin/Manager | Get order statistics    |

### Checkout
| Method | Endpoint                      | Access    | Description              |
|--------|-------------------------------|-----------|--------------------------|
| POST   | /api/checkout/create-order    | Protected | Create Razorpay order    |
| POST   | /api/checkout/verify-payment  | Protected | Verify payment signature |

### Users (Admin Only)
| Method | Endpoint              | Access | Description          |
|--------|-----------------------|--------|----------------------|
| GET    | /api/users           | Admin  | Get all users        |
| GET    | /api/users/:id       | Admin  | Get single user      |
| PUT    | /api/users/:id/role  | Admin  | Update user role     |
| DELETE | /api/users/:id       | Admin  | Delete user          |
| PUT    | /api/users/profile   | Protected | Update own profile |

## 🗄️ Database Schema

### users
- id (SERIAL PRIMARY KEY)
- name (VARCHAR)
- email (VARCHAR UNIQUE)
- password_hash (VARCHAR)
- role (ENUM: customer, manager, admin)
- default_address (TEXT)
- created_at (TIMESTAMP)

### products
- id (SERIAL PRIMARY KEY)
- name (VARCHAR)
- description (TEXT)
- price (DECIMAL)
- stock_quantity (INTEGER)
- image_url (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### categories
- id (SERIAL PRIMARY KEY)
- name (VARCHAR)
- slug (VARCHAR UNIQUE)
- description (TEXT)
- created_at (TIMESTAMP)

### product_categories (Junction Table)
- product_id (INTEGER FK)
- category_id (INTEGER FK)
- PRIMARY KEY (product_id, category_id)

### cart_items
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER FK)
- product_id (INTEGER FK)
- quantity (INTEGER)
- created_at (TIMESTAMP)
- UNIQUE (user_id, product_id)

### orders
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER FK)
- razorpay_order_id (VARCHAR)
- razorpay_payment_id (VARCHAR)
- razorpay_signature (VARCHAR)
- total_price (DECIMAL)
- status (ENUM)
- shipping_address (TEXT)
- created_at (TIMESTAMP)

### order_items
- id (SERIAL PRIMARY KEY)
- order_id (INTEGER FK)
- product_id (INTEGER FK)
- quantity (INTEGER)
- price_at_purchase (DECIMAL)

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication.

### How to Authenticate Requests

1. Login or register to get a token
2. Include token in Authorization header:
   ```
   Authorization: Bearer <your-jwt-token>
   ```

### Token Payload
```json
{
  "userId": 1,
  "email": "user@example.com",
  "role": "customer",
  "iat": 1234567890,
  "exp": 1234567890
}
```

## 🔒 Authorization Roles

| Role     | Permissions                                          |
|----------|-----------------------------------------------------|
| customer | Browse products, manage own cart, place orders      |
| manager  | All customer permissions + manage products/orders   |
| admin    | All permissions + user management                   |

## 📝 Request/Response Examples

### Register User
```bash
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}

# Response
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "customer"
  }
}
```

### Get Products with Filters
```bash
GET /api/products?category=party-wear&minPrice=1000&maxPrice=5000&page=1&limit=12

# Response
{
  "success": true,
  "products": [...],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 50,
    "pages": 5
  }
}
```

### Create Product (Admin/Manager)
```bash
POST /api/products
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Elegant Evening Gown",
  "description": "Beautiful evening gown...",
  "price": 8999.00,
  "stock_quantity": 15,
  "image_url": "https://...",
  "category_ids": [1, 3]
}

# Response
{
  "success": true,
  "message": "Product created successfully",
  "product": {...}
}
```

### Add to Cart
```bash
POST /api/cart
Authorization: Bearer <token>
Content-Type: application/json

{
  "product_id": 5,
  "quantity": 2
}

# Response
{
  "success": true,
  "message": "Item added to cart",
  "cartItem": {...}
}
```

### Create Order (Checkout)
```bash
POST /api/checkout/create-order
Authorization: Bearer <token>
Content-Type: application/json

{
  "shipping_address": "123 Main St, Mumbai, India 400001"
}

# Response
{
  "success": true,
  "order": {
    "id": 25,
    "razorpayOrderId": "order_abc123",
    "amount": 5999.00,
    "currency": "INR"
  }
}
```

## 🛡️ Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error message here"
}
```

HTTP Status Codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

## 🔧 Scripts

```bash
# Development
npm run dev          # Start with nodemon (auto-reload)

# Production
npm start            # Start server

# Database
npm run db:init      # Initialize database schema
npm run db:seed      # Seed sample data
```

## 📦 Dependencies

### Production
- **express**: Web framework
- **pg**: PostgreSQL client
- **bcryptjs**: Password hashing
- **jsonwebtoken**: JWT authentication
- **razorpay**: Payment gateway
- **express-validator**: Input validation
- **cors**: Cross-origin resource sharing
- **helmet**: Security headers
- **express-rate-limit**: Rate limiting
- **dotenv**: Environment variables

### Development
- **nodemon**: Auto-restart server

## 🧪 Testing API

You can use tools like:
- **Postman**: [Download](https://www.postman.com/)
- **Insomnia**: [Download](https://insomnia.rest/)
- **Thunder Client**: VSCode extension
- **curl**: Command line

## 📧 Support

For API issues or questions, contact the development team.







