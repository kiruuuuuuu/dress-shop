<!-- 442eb57f-7073-4184-a178-c846bf3a05f0 6c47e780-f280-4e90-b7fc-05a5914e3cfc -->
# Full-Stack Online Dress Shopping Portal Implementation

## Phase 1: Project Foundation & Database

### 1.1 Project Structure Setup

- Create root folder structure: `/server` (backend), `/client` (frontend)
- Initialize Git repository
- Setup `.gitignore` for both environments

### 1.2 Backend Initialization (`/server`)

- Initialize Node.js project with `package.json`
- Install core dependencies:
- `express`, `pg` (PostgreSQL client), `cors`, `dotenv`
- `bcryptjs` (password hashing), `jsonwebtoken` (JWT auth)
- `razorpay`, `crypto` (payment verification)
- `express-validator` (input validation)
- Create folder structure: `/config`, `/middleware`, `/routes`, `/controllers`, `/models`
- Setup `.env.example` with required environment variables

### 1.3 Database Schema Design

Create PostgreSQL schema with migrations:

- **users** table: id, name, email, password_hash, role (ENUM: customer/manager/admin), default_address, created_at
- **categories** table: id, name, slug, description, created_at
- **products** table: id, name, description, price, stock_quantity, image_url, created_at, updated_at
- **product_categories** table: product_id, category_id (many-to-many relationship)
- **cart_items** table: id, user_id, product_id, quantity, created_at
- **orders** table: id, user_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, total_price, status (ENUM: pending/processing/shipped/delivered/cancelled), shipping_address, created_at
- **order_items** table: id, order_id, product_id, quantity, price_at_purchase

### 1.4 Database Configuration

- Setup PostgreSQL connection in `/server/config/database.js`
- Create initialization script to run schema migrations

## Phase 2: Backend API - Authentication & Core

### 2.1 Authentication System

**Files to create:**

- `/server/controllers/authController.js`: Registration, login, token refresh logic
- `/server/routes/authRoutes.js`: POST `/api/auth/register`, POST `/api/auth/login`, GET `/api/auth/me`
- `/server/middleware/auth.js`: `isAuthenticated` middleware (verify JWT), `isAuthorized([roles])` middleware (RBAC)

**Key features:**

- Password hashing with bcryptjs (10 salt rounds)
- JWT token generation with payload: `{userId, role, email}`
- JWT verification middleware for protected routes
- Role-based authorization middleware

### 2.2 Public Product Endpoints

**Files to create:**

- `/server/controllers/productController.js`: Product CRUD logic
- `/server/routes/productRoutes.js`

**Endpoints:**

- GET `/api/products` - List all products with optional category filter, pagination
- GET `/api/products/:id` - Get single product with category details
- GET `/api/categories` - List all categories

### 2.3 Server Entry Point

- `/server/server.js`: Express app initialization, middleware setup (CORS, JSON parsing), route mounting, error handling

## Phase 3: Customer Storefront (Next.js Frontend)

### 3.1 Frontend Initialization (`/client`)

- Initialize Next.js with TypeScript: `npx create-next-app@latest`
- Install Tailwind CSS (configured for mobile-first)
- Install dependencies: `axios`, `js-cookie`, `react-hot-toast`
- Setup folder structure: `/components`, `/context`, `/hooks`, `/lib`, `/styles`, `/public`

### 3.2 Global State & Auth Context

**Files to create:**

- `/client/context/AuthContext.tsx`: Manage user state (isLoggedIn, user object with role), login/logout functions, JWT storage
- `/client/lib/api.ts`: Axios instance with base URL, interceptors for auth token
- `/client/hooks/useAuth.ts`: Custom hook to access auth context

### 3.3 Reusable Components (Mobile-First)

**Files to create:**

- `/client/components/Navbar.tsx`: Responsive nav with mobile menu, cart icon, user dropdown
- `/client/components/Footer.tsx`: Links, contact info
- `/client/components/ProductCard.tsx`: Product display with image, price, "Add to Cart" button
- `/client/components/Button.tsx`: Reusable styled button component
- `/client/components/Input.tsx`: Form input component

### 3.4 Customer Pages

**Files to create:**

- `/client/app/page.tsx`: Homepage with hero section, featured products grid
- `/client/app/products/page.tsx`: All products with filters (category, price range), responsive grid
- `/client/app/products/[id]/page.tsx`: Product detail page with image, description, size selector, "Add to Cart"
- `/client/app/login/page.tsx`: Login form with email/password
- `/client/app/register/page.tsx`: Registration form
- `/client/app/cart/page.tsx`: Cart items list, quantity controls, subtotal, "Proceed to Checkout" button
- `/client/app/profile/page.tsx`: User profile with order history (protected route)

### 3.5 Cart Functionality

**Files to create:**

- `/client/context/CartContext.tsx`: Cart state management (add, remove, update quantity)
- Backend endpoint: POST `/api/cart` (add item), GET `/api/cart` (get user cart), DELETE `/api/cart/:itemId`

## Phase 4: Backend Admin & Management API

### 4.1 Protected Product Management

**Update `/server/controllers/productController.js` and routes:**

- POST `/api/products` - Create product (admin/manager only)
- PUT `/api/products/:id` - Update product (admin/manager only)
- DELETE `/api/products/:id` - Delete product (admin/manager only)
- Apply `isAuthenticated` and `isAuthorized(['admin', 'manager'])` middleware

### 4.2 Order Management Endpoints

**Files to create:**

- `/server/controllers/orderController.js`
- `/server/routes/orderRoutes.js`

**Endpoints:**

- GET `/api/orders` - Get all orders (admin/manager only), with filters (status, date range)
- GET `/api/orders/:id` - Get single order with items (admin/manager only)
- PUT `/api/orders/:id/status` - Update order status (admin/manager only)
- GET `/api/orders/user/:userId` - Get user's orders (customer can only see their own)

### 4.3 User Management (Admin Only)

**Files to create:**

- `/server/controllers/userController.js`
- `/server/routes/userRoutes.js`

**Endpoints:**

- GET `/api/users` - List all users (admin only)
- GET `/api/users/:id` - Get single user (admin only)
- PUT `/api/users/:id/role` - Update user role (admin only)
- DELETE `/api/users/:id` - Delete user (admin only)

## Phase 5: Admin Dashboard Frontend

### 5.1 Dashboard Layout & Protection

**Files to create:**

- `/client/app/dashboard/layout.tsx`: Protected layout, checks user role (redirect if not admin/manager)
- `/client/components/DashboardSidebar.tsx`: Navigation for dashboard pages (responsive)
- `/client/components/ProtectedRoute.tsx`: Higher-order component for role-based route protection

### 5.2 Dashboard Pages (Mobile-Responsive)

**Files to create:**

- `/client/app/dashboard/page.tsx`: Dashboard home with analytics summary (total orders, revenue, low stock alerts)
- `/client/app/dashboard/orders/page.tsx`: Orders table with status filters, search, pagination, "Update Status" action
- `/client/app/dashboard/products/page.tsx`: Products table with edit/delete actions, "Add New Product" button
- `/client/app/dashboard/products/new/page.tsx`: Form to create new product (name, description, price, stock, image upload, categories)
- `/client/app/dashboard/products/[id]/edit/page.tsx`: Form to edit existing product
- `/client/app/dashboard/users/page.tsx`: Users table with role dropdown (admin only)
- `/client/app/dashboard/categories/page.tsx`: Manage categories (CRUD)

### 5.3 Dashboard Components

**Files to create:**

- `/client/components/OrderTable.tsx`: Responsive table/cards for orders
- `/client/components/ProductForm.tsx`: Reusable form for create/edit product
- `/client/components/StatusBadge.tsx`: Colored badge for order status

## Phase 6: Checkout & Razorpay Integration

### 6.1 Backend Checkout Flow

**Files to create:**

- `/server/controllers/checkoutController.js`
- `/server/routes/checkoutRoutes.js`

**Endpoints:**

- POST `/api/checkout/create-order`: 
- Calculate total from user's cart
- Create Razorpay order: `razorpay.orders.create({amount, currency: 'INR', receipt})`
- Save order in DB with status 'pending'
- Return `{orderId, amount, currency, razorpayOrderId}`

- POST `/api/checkout/verify-payment`:
- Receive `{razorpay_order_id, razorpay_payment_id, razorpay_signature}`
- **CRITICAL**: Verify signature using `crypto.createHmac('sha256', RAZORPAY_KEY_SECRET)`
- If valid: Update order status to 'processing', save payment IDs, clear user cart
- Return success response

### 6.2 Frontend Checkout & Payment

**Files to create:**

- `/client/app/checkout/page.tsx`: 
- Display order summary
- Shipping address form
- "Pay Now" button that triggers Razorpay modal
- Load Razorpay script dynamically
- Initialize Razorpay with `key_id`, `amount`, `order_id`, and handler function

- `/client/app/order-success/page.tsx`: Order confirmation page with order details

**Razorpay Integration Steps:**

1. Load checkout.js script in checkout page
2. On "Pay Now" click, call `/api/checkout/create-order`
3. Initialize Razorpay modal with received order_id
4. On success, send payment response to `/api/checkout/verify-payment`
5. Redirect to order success page

### 6.3 Configuration Files

**Files to create:**

- `/server/config/razorpay.js`: Initialize Razorpay instance with key_id and key_secret
- `/client/.env.local`: Add `NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_placeholder`
- `/server/.env`: Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` placeholders

## Phase 7: Polish & Deployment Prep

### 7.1 Error Handling & Validation

- Add comprehensive error handling middleware in Express
- Add input validation using express-validator on all POST/PUT endpoints
- Add client-side form validation
- Add loading states and error messages in frontend (using react-hot-toast)

### 7.2 Security Enhancements

- Implement rate limiting on auth endpoints
- Add CORS configuration for production
- Sanitize user inputs
- Add helmet.js for HTTP headers security
- Implement CSRF protection

### 7.3 Image Handling

- Use Next.js `<Image>` component throughout frontend
- Setup image upload endpoint for product images (could use Cloudinary or local storage)
- Implement image optimization

### 7.4 Responsive Design Polish

- Test all pages on mobile, tablet, desktop viewports
- Ensure Tailwind mobile-first approach is consistent
- Add loading skeletons for better UX

### 7.5 Deployment Configuration

**Files to create:**

- `/.gitignore`: Exclude node_modules, .env files
- `/server/Dockerfile` (optional for containerization)
- `/client/next.config.js`: Configure for production build
- Deployment guides for Render (backend) and Vercel (frontend)
- Database migration scripts for production

### 7.6 Documentation

**Files to create:**

- `/README.md`: Project overview, setup instructions, tech stack
- `/server/README.md`: API documentation, endpoints list
- `/DEPLOYMENT.md`: Step-by-step deployment guide

## Key Implementation Notes

1. **Mobile-First CSS**: All Tailwind classes start with mobile, then `sm:`, `md:`, `lg:` breakpoints
2. **Security**: Never skip bcrypt password hashing or Razorpay signature verification
3. **JWT Storage**: Use httpOnly cookies for production (more secure than localStorage)
4. **Database Indexes**: Add indexes on frequently queried fields (email, category_id, user_id in orders)
5. **Error Messages**: User-friendly on frontend, detailed logs on backend
6. **Seed Data**: Create seed script to populate initial admin user and sample products for testing

### To-dos - Core Features (COMPLETED ✅)

- [x] Initialize project structure with server and client folders, Git repo, and gitignore files
- [x] Setup Node.js/Express backend with all required dependencies and folder structure
- [x] Create PostgreSQL database schema with all required tables and relationships
- [x] Implement authentication system with JWT, password hashing, and middleware
- [x] Build public API endpoints for products and categories
- [x] Initialize Next.js frontend with Tailwind CSS and project structure
- [x] Create authentication context and API client for frontend
- [x] Build reusable UI components (Navbar, Footer, ProductCard, forms)
- [x] Create all customer-facing pages (home, products, product detail, cart, profile)
- [x] Implement cart functionality on frontend and backend
- [x] Build protected admin/manager API endpoints for products, orders, and users
- [x] Create admin dashboard layout with protected routes and navigation
- [x] Build all dashboard pages (orders, products, users management)
- [x] Implement Razorpay checkout endpoints with signature verification
- [x] Integrate Razorpay checkout modal in frontend checkout page
- [x] Add comprehensive error handling and validation throughout the app
- [x] Implement security measures (rate limiting, CORS, input sanitization)
- [x] Test and polish mobile responsiveness across all pages
- [x] Create deployment configurations and documentation

### Additional Features - NEW (COMPLETED ✅)

- [x] **AI Support Chat System**
  - [x] Create support tickets table and responses table in database
  - [x] Build support ticket API endpoints (create, list, respond, update status)
  - [x] Create floating chat component in frontend
  - [x] Build admin/manager support tickets dashboard
  - [x] Implement ticket status tracking (open, in_progress, closed)

- [x] **Product Return System**
  - [x] Add return_days column to products table
  - [x] Create return_requests table in database
  - [x] Build return request API endpoints
  - [x] Add return eligibility checking logic
  - [x] Create customer returns page
  - [x] Build manager return requests dashboard
  - [x] Add return request functionality to orders page

- [x] **Order Approval Workflow**
  - [x] Add approval_status, approved_by, approved_at columns to orders table
  - [x] Create notifications table for manager alerts
  - [x] Build order approval API endpoints
  - [x] Implement manager notification system for new orders
  - [x] Create order approvals dashboard for managers
  - [x] Build bill generation functionality
  - [x] Add approval status display on customer orders

### Bug Fixes & Improvements (COMPLETED ✅)

- [x] Fix all TypeScript errors (22 total)
  - [x] Fix "loading is not defined" errors in dashboard pages
  - [x] Fix API response data access issues
  - [x] Fix price.toFixed() errors with parseFloat conversion
  - [x] Fix support chat is_staff vs is_admin mismatch

- [x] Fix all runtime errors
  - [x] Add missing ordersApi.getMyOrders() function
  - [x] Fix database seed script (column names, duplicates)
  - [x] Fix SQL JSON aggregation query
  - [x] Fix checkout controller export mismatch

- [x] Fix Next.js issues
  - [x] Create error.tsx component
  - [x] Create not-found.tsx component
  - [x] Create loading.tsx component
  - [x] Fix homepage icon display sizing

- [x] Fix backend issues
  - [x] Adjust rate limiting for development (5 → 100 requests)
  - [x] Add environment-aware rate limiting configuration
  - [x] Skip localhost rate limiting in development

### Documentation (COMPLETED ✅)

- [x] Consolidate 16 MD files into 4 organized documents
- [x] Create comprehensive PROJECT_GUIDE.md
- [x] Create DEPLOY_AND_TROUBLESHOOT.md
- [x] Create detailed CHANGELOG.md
- [x] Update README.md with new documentation structure
- [x] Document all new features and fixes
- [x] Update project plan with completed tasks

### Future Enhancements (Optional)

- [ ] Add email notifications for orders and tickets
- [ ] Implement product reviews and ratings
- [ ] Add wishlist functionality
- [ ] Build advanced analytics dashboard
- [ ] Add multi-language support
- [ ] Create mobile app with React Native
- [ ] Implement real-time chat with WebSockets
- [ ] Add image optimization with Cloudinary