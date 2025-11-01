const pool = require('../config/database');

const addNewFeatures = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Adding new features to database...');

    // Create approval_status ENUM for orders
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE approval_status AS ENUM ('pending_approval', 'approved', 'rejected');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create ticket_status ENUM for support tickets
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create ticket_type ENUM
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE ticket_type AS ENUM ('feedback', 'error', 'question', 'complaint', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create return_status ENUM
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE return_status AS ENUM ('requested', 'approved', 'rejected', 'processing', 'completed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create print_status ENUM
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE print_status AS ENUM ('pending', 'printing', 'completed', 'failed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add return_days column to products table
    await client.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS return_days INTEGER DEFAULT 0 CHECK (return_days >= 0)
    `);
    console.log('✅ Added return_days column to products table');

    // Add approval_status column to orders table
    await client.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS approval_status approval_status DEFAULT 'pending_approval'
    `);
    console.log('✅ Added approval_status column to orders table');

    // Add approved_by and approved_at columns to orders table
    await client.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP
    `);
    console.log('✅ Added approval tracking columns to orders table');

    // Add print_status and print_error columns to orders table
    await client.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS print_status print_status DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS print_error TEXT,
      ADD COLUMN IF NOT EXISTS printed_at TIMESTAMP
    `);
    console.log('✅ Added print tracking columns to orders table');

    // Create support_tickets table
    await client.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        type ticket_type DEFAULT 'other',
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        status ticket_status DEFAULT 'open',
        priority VARCHAR(20) DEFAULT 'normal',
        assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created support_tickets table');

    // Create ticket_responses table for chat-like responses
    await client.query(`
      CREATE TABLE IF NOT EXISTS ticket_responses (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER REFERENCES support_tickets(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        message TEXT NOT NULL,
        is_admin BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created ticket_responses table');

    // Create return_requests table
    await client.query(`
      CREATE TABLE IF NOT EXISTS return_requests (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        order_item_id INTEGER REFERENCES order_items(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        reason TEXT NOT NULL,
        status return_status DEFAULT 'requested',
        reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMP,
        admin_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created return_requests table');

    // Create notifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        related_id INTEGER,
        related_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created notifications table');

    // Create print_history table to track all print attempts
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
    console.log('✅ Created print_history table');

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
      CREATE INDEX IF NOT EXISTS idx_ticket_responses_ticket ON ticket_responses(ticket_id);
      CREATE INDEX IF NOT EXISTS idx_return_requests_order ON return_requests(order_id);
      CREATE INDEX IF NOT EXISTS idx_return_requests_user ON return_requests(user_id);
      CREATE INDEX IF NOT EXISTS idx_return_requests_status ON return_requests(status);
      CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
      CREATE INDEX IF NOT EXISTS idx_orders_approval_status ON orders(approval_status);
      CREATE INDEX IF NOT EXISTS idx_print_history_order ON print_history(order_id);
      CREATE INDEX IF NOT EXISTS idx_orders_print_status ON orders(print_status);
    `);
    console.log('✅ Created indexes for new tables');

    console.log('✅ All new features added successfully!');
    console.log('📊 New tables: support_tickets, ticket_responses, return_requests, notifications, print_history');
    console.log('📊 Updated tables: products (return_days), orders (approval_status, approved_by, approved_at, print_status, print_error, printed_at)');
    
  } catch (error) {
    console.error('❌ Error adding new features:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run the migration if called directly (not imported)
if (require.main === module) {
  addNewFeatures()
    .then(() => {
      console.log('🎉 Database migration completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database migration failed:', error);
      process.exit(1);
    });
}

// Export for use in other modules
module.exports = addNewFeatures;

