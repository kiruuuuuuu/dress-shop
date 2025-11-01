const pool = require('../config/database');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role, email_verified)
       VALUES ($1, $2, $3, $4, TRUE)
       ON CONFLICT (email) DO UPDATE SET email_verified = TRUE`,
      ['Admin User', 'admin@example.com', adminPassword, 'admin']
    );
    console.log('✅ Admin user created (email: admin@example.com, password: admin123)');

    // Create manager user
    const managerPassword = await bcrypt.hash('manager123', 10);
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role, email_verified)
       VALUES ($1, $2, $3, $4, TRUE)
       ON CONFLICT (email) DO UPDATE SET email_verified = TRUE`,
      ['Manager User', 'manager@example.com', managerPassword, 'manager']
    );
    console.log('✅ Manager user created (email: manager@example.com, password: manager123)');

    // Create customer user
    const customerPassword = await bcrypt.hash('customer123', 10);
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role, email_verified)
       VALUES ($1, $2, $3, $4, TRUE)
       ON CONFLICT (email) DO UPDATE SET email_verified = TRUE`,
      ['Customer User', 'customer@example.com', customerPassword, 'customer']
    );
    console.log('✅ Customer user created (email: customer@example.com, password: customer123)');

    // Create categories
    const categories = [
      ['Sarees', 'Traditional and modern sarees for every occasion'],
      ['Tops', 'Blouses, kurtas, and stylish tops'],
      ['Bottoms', 'Petticoats, leggings, and traditional bottoms'],
      ['Accessories', 'Jewelry, bangles, and traditional accessories'],
      ['Casual Wear', 'Casual and everyday wear collection']
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
        name: 'Silk Saree - Red',
        description: 'Traditional silk saree in vibrant red color',
        price: 3999,
        stock: 15,
        category: 'Sarees',
        image_url: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=500',
        return_days: 30
      },
      {
        name: 'Cotton Saree - Pastel',
        description: 'Elegant cotton saree with floral patterns',
        price: 1499,
        stock: 25,
        category: 'Sarees',
        image_url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500',
        return_days: 30
      },
      {
        name: 'Casual Wear - Kurti Set',
        description: 'Comfortable kurti set for everyday wear',
        price: 899,
        stock: 20,
        category: 'Casual Wear',
        image_url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500',
        return_days: 30
      },
      {
        name: 'Designer Blouse - Silk',
        description: 'Stylish silk blouse with embroidery',
        price: 1999,
        stock: 30,
        category: 'Tops',
        image_url: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=500',
        return_days: 15
      },
      {
        name: 'Traditional Kurti',
        description: 'Elegant cotton kurti with traditional prints',
        price: 799,
        stock: 50,
        category: 'Tops',
        image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500',
        return_days: 7
      },
      {
        name: 'Leggings - Black',
        description: 'Comfortable leggings for traditional wear',
        price: 599,
        stock: 35,
        category: 'Bottoms',
        image_url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=500',
        return_days: 30
      },
      {
        name: 'Petticoat - Silk',
        description: 'High quality silk petticoat',
        price: 1299,
        stock: 20,
        category: 'Bottoms',
        image_url: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=500',
        return_days: 30
      },
      {
        name: 'Traditional Handbag',
        description: 'Beautiful traditional handbag with embroidery',
        price: 2999,
        stock: 12,
        category: 'Accessories',
        image_url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500',
        return_days: 14
      },
      {
        name: 'Designer Necklace Set',
        description: 'Elegant traditional necklace set with matching earrings',
        price: 4999,
        stock: 40,
        category: 'Accessories',
        image_url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500',
        return_days: 7
      },
      {
        name: 'Traditional Sandals',
        description: 'Comfortable traditional sandals for everyday wear',
        price: 899,
        stock: 18,
        category: 'Accessories',
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
