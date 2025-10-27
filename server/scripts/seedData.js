const pool = require('../config/database');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      ['Admin User', 'admin@example.com', adminPassword, 'admin']
    );
    console.log('✅ Admin user created (email: admin@example.com, password: admin123)');

    // Create manager user
    const managerPassword = await bcrypt.hash('manager123', 10);
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      ['Manager User', 'manager@example.com', managerPassword, 'manager']
    );
    console.log('✅ Manager user created (email: manager@example.com, password: manager123)');

    // Create customer user
    const customerPassword = await bcrypt.hash('customer123', 10);
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      ['Customer User', 'customer@example.com', customerPassword, 'customer']
    );
    console.log('✅ Customer user created (email: customer@example.com, password: customer123)');

    // Create categories
    const categories = [
      ['Dresses', 'Beautiful dresses for all occasions'],
      ['Tops', 'Stylish tops and blouses'],
      ['Bottoms', 'Skirts and pants'],
      ['Accessories', 'Complete your look with accessories'],
      ['Shoes', 'Footwear for every style']
    ];

    for (const [name, description] of categories) {
      const { rows } = await pool.query(
        'SELECT id FROM categories WHERE name = $1',
        [name]
      );
      if (rows.length === 0) {
        const slug = name.toLowerCase().replace(/\s+/g, '-');
        await pool.query(
          `INSERT INTO categories (name, slug, description) VALUES ($1, $2, $3)`,
          [name, slug, description]
        );
      }
    }
    console.log('✅ Categories created');

    // Get category IDs
    const { rows: categoryRows } = await pool.query('SELECT id, name FROM categories');
    const categoryMap = {};
    categoryRows.forEach(cat => {
      categoryMap[cat.name] = cat.id;
    });

    // Create products
    const products = [
      {
        name: 'Elegant Evening Dress',
        description: 'A stunning evening dress perfect for special occasions',
        price: 129.99,
        stock: 15,
        category: 'Dresses',
        image_url: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=500',
        return_days: 30
      },
      {
        name: 'Summer Floral Dress',
        description: 'Light and breezy dress with beautiful floral patterns',
        price: 79.99,
        stock: 25,
        category: 'Dresses',
        image_url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500',
        return_days: 30
      },
      {
        name: 'Casual Maxi Dress',
        description: 'Comfortable maxi dress for everyday wear',
        price: 89.99,
        stock: 20,
        category: 'Dresses',
        image_url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500',
        return_days: 30
      },
      {
        name: 'Silk Blouse',
        description: 'Luxurious silk blouse for a sophisticated look',
        price: 69.99,
        stock: 30,
        category: 'Tops',
        image_url: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=500',
        return_days: 15
      },
      {
        name: 'Cotton T-Shirt',
        description: 'Soft and comfortable cotton t-shirt',
        price: 29.99,
        stock: 50,
        category: 'Tops',
        image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500',
        return_days: 7
      },
      {
        name: 'Denim Jeans',
        description: 'Classic denim jeans that never go out of style',
        price: 79.99,
        stock: 35,
        category: 'Bottoms',
        image_url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=500',
        return_days: 30
      },
      {
        name: 'Pleated Skirt',
        description: 'Elegant pleated skirt for any occasion',
        price: 59.99,
        stock: 20,
        category: 'Bottoms',
        image_url: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=500',
        return_days: 30
      },
      {
        name: 'Leather Handbag',
        description: 'Premium leather handbag with multiple compartments',
        price: 149.99,
        stock: 12,
        category: 'Accessories',
        image_url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500',
        return_days: 14
      },
      {
        name: 'Statement Necklace',
        description: 'Bold statement necklace to elevate any outfit',
        price: 39.99,
        stock: 40,
        category: 'Accessories',
        image_url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500',
        return_days: 7
      },
      {
        name: 'Ankle Boots',
        description: 'Stylish ankle boots for fall and winter',
        price: 119.99,
        stock: 18,
        category: 'Shoes',
        image_url: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=500',
        return_days: 30
      }
    ];

    for (const product of products) {
      const categoryId = categoryMap[product.category];
      if (categoryId) {
        // Check if product exists
        const { rows: existingProduct } = await pool.query(
          'SELECT id FROM products WHERE name = $1',
          [product.name]
        );

        let productId;
        if (existingProduct.length === 0) {
          const { rows } = await pool.query(
            `INSERT INTO products (name, description, price, stock_quantity, image_url, return_days)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [product.name, product.description, product.price, product.stock, product.image_url, product.return_days]
          );
          productId = rows[0].id;
        } else {
          productId = existingProduct[0].id;
        }

        // Link product to category
        const { rows: existingLink } = await pool.query(
          'SELECT * FROM product_categories WHERE product_id = $1 AND category_id = $2',
          [productId, categoryId]
        );
        
        if (existingLink.length === 0) {
          await pool.query(
            `INSERT INTO product_categories (product_id, category_id) VALUES ($1, $2)`,
            [productId, categoryId]
          );
        }
      }
    }
    console.log('✅ Products created and linked to categories');

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📝 Test Users:');
    console.log('   Admin: admin@example.com / admin123');
    console.log('   Manager: manager@example.com / manager123');
    console.log('   Customer: customer@example.com / customer123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
