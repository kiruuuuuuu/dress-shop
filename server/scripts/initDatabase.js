const pool = require('../config/database');

const createTables = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting database initialization...');

    // Enable UUID extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // Create ENUM types
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('customer', 'manager', 'admin');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE order_status AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE print_status AS ENUM ('pending', 'printing', 'completed', 'failed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role user_role DEFAULT 'customer',
        mobile_number VARCHAR(15),
        default_address TEXT,
        email_verified BOOLEAN DEFAULT FALSE,
        verification_token VARCHAR(255),
        verification_token_expiry TIMESTAMP,
        reset_token VARCHAR(255),
        reset_token_expiry TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add email verification and password reset columns to existing users table (if not exists)
    // This allows the script to work on both new and existing databases
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='users' AND column_name='email_verified') THEN
          ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='users' AND column_name='verification_token') THEN
          ALTER TABLE users ADD COLUMN verification_token VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='users' AND column_name='verification_token_expiry') THEN
          ALTER TABLE users ADD COLUMN verification_token_expiry TIMESTAMP;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='users' AND column_name='reset_token') THEN
          ALTER TABLE users ADD COLUMN reset_token VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='users' AND column_name='reset_token_expiry') THEN
          ALTER TABLE users ADD COLUMN reset_token_expiry TIMESTAMP;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='users' AND column_name='mobile_number') THEN
          ALTER TABLE users ADD COLUMN mobile_number VARCHAR(15);
        END IF;
      END $$;
    `);

    // Create index on email for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `);

    // Create categories table
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create products table
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
        stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
        product_code VARCHAR(50) UNIQUE,
        image_url TEXT,
        image_path TEXT,
        return_days INTEGER DEFAULT 7,
        is_featured BOOLEAN DEFAULT FALSE,
        featured_order INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create product_categories junction table
    await client.query(`
      CREATE TABLE IF NOT EXISTS product_categories (
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
        PRIMARY KEY (product_id, category_id)
      )
    `);

    // Create cart_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS cart_items (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, product_id)
      )
    `);

    // Create index on cart_items for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cart_items_user ON cart_items(user_id)
    `);

    // Create orders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_number VARCHAR(50) UNIQUE,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        razorpay_order_id VARCHAR(255),
        razorpay_payment_id VARCHAR(255),
        razorpay_signature VARCHAR(255),
        total_price DECIMAL(10, 2) NOT NULL CHECK (total_price >= 0),
        status order_status DEFAULT 'pending',
        shipping_address TEXT NOT NULL,
        shipping_address_id INTEGER,
        shipping_mobile VARCHAR(15),
        shipping_pincode VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add order_number column if it doesn't exist (for existing databases)
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='orders' AND column_name='order_number') THEN
          ALTER TABLE orders ADD COLUMN order_number VARCHAR(50);
          CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
        END IF;
      END $$;
    `);

    // Add approval_status and related columns if they don't exist
    // This allows the script to work on both new and existing databases
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='orders' AND column_name='approval_status') THEN
          ALTER TABLE orders ADD COLUMN approval_status VARCHAR(50) DEFAULT 'pending';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='orders' AND column_name='approved_by') THEN
          ALTER TABLE orders ADD COLUMN approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='orders' AND column_name='approved_at') THEN
          ALTER TABLE orders ADD COLUMN approved_at TIMESTAMP;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='orders' AND column_name='shipping_address_id') THEN
          ALTER TABLE orders ADD COLUMN shipping_address_id INTEGER;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='orders' AND column_name='shipping_mobile') THEN
          ALTER TABLE orders ADD COLUMN shipping_mobile VARCHAR(15);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='orders' AND column_name='shipping_pincode') THEN
          ALTER TABLE orders ADD COLUMN shipping_pincode VARCHAR(10);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='orders' AND column_name='print_status') THEN
          ALTER TABLE orders ADD COLUMN print_status print_status DEFAULT 'pending';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='orders' AND column_name='print_error') THEN
          ALTER TABLE orders ADD COLUMN print_error TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='orders' AND column_name='printed_at') THEN
          ALTER TABLE orders ADD COLUMN printed_at TIMESTAMP;
        END IF;
      END $$;
    `);

    // Create user_addresses table for multiple addresses
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_addresses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        address_type VARCHAR(50) DEFAULT 'home',
        full_name VARCHAR(255) NOT NULL,
        mobile_number VARCHAR(15) NOT NULL,
        house_number VARCHAR(50),
        address_line1 VARCHAR(255) NOT NULL,
        address_line2 VARCHAR(255),
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        pincode VARCHAR(10) NOT NULL,
        country VARCHAR(100) DEFAULT 'India',
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add house_number column if it doesn't exist (for existing databases)
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='user_addresses' AND column_name='house_number') THEN
          ALTER TABLE user_addresses ADD COLUMN house_number VARCHAR(50);
        END IF;
      END $$;
    `);

    // Create indexes on orders for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)
    `);
    
    // Create index on user_addresses
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_addresses_user ON user_addresses(user_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_razorpay ON orders(razorpay_order_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_print_status ON orders(print_status)
    `);

    // Create order_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        price_at_purchase DECIMAL(10, 2) NOT NULL CHECK (price_at_purchase >= 0)
      )
    `);

    // Create index on order_items for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id)
    `);

    // Create printer_settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS printer_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        printer_name VARCHAR(255) NOT NULL,
        printer_ip VARCHAR(50),
        connection_type VARCHAR(50) DEFAULT 'wifi',
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add indexes for printer_settings
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_printer_settings_user ON printer_settings(user_id)
    `);

    // Create print_history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS print_history (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        status print_status NOT NULL,
        error_message TEXT,
        printer_name VARCHAR(255),
        printer_ip VARCHAR(50),
        attempts INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_print_history_order ON print_history(order_id)
    `);

    // Add new columns to products table if they don't exist (for existing databases)
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='products' AND column_name='product_code') THEN
          ALTER TABLE products ADD COLUMN product_code VARCHAR(50);
          CREATE UNIQUE INDEX IF NOT EXISTS idx_products_product_code ON products(product_code) WHERE product_code IS NOT NULL;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='products' AND column_name='is_featured') THEN
          ALTER TABLE products ADD COLUMN is_featured BOOLEAN DEFAULT FALSE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='products' AND column_name='featured_order') THEN
          ALTER TABLE products ADD COLUMN featured_order INTEGER;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='products' AND column_name='image_path') THEN
          ALTER TABLE products ADD COLUMN image_path TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='products' AND column_name='return_days') THEN
          ALTER TABLE products ADD COLUMN return_days INTEGER DEFAULT 7;
        END IF;
      END $$;
    `);

    console.log('✅ Database tables created successfully!');
    console.log('📊 Tables: users, categories, products, product_categories, cart_items, orders, order_items, printer_settings, print_history');
    
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run the initialization
createTables()
  .then(() => {
    console.log('🎉 Database initialization completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Database initialization failed:', error);
    process.exit(1);
  });






