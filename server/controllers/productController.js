const pool = require('../config/database');
const { validationResult } = require('express-validator');
const cloudinary = require('../config/cloudinary');

// @desc    Get all products with optional filters
// @route   GET /api/products
// @access  Public
const getAllProducts = async (req, res) => {
  try {
    const { category, minPrice, maxPrice, search, page = 1, limit = 12 } = req.query;
    
    let query = `
      SELECT p.*, 
        COALESCE(
          json_agg(
            json_build_object('id', c.id, 'name', c.name, 'slug', c.slug)
          ) FILTER (WHERE c.id IS NOT NULL), '[]'
        ) as categories
      FROM products p
      LEFT JOIN product_categories pc ON p.id = pc.product_id
      LEFT JOIN categories c ON pc.category_id = c.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCounter = 1;

    // Filter by category
    if (category) {
      query += ` AND c.slug = $${paramCounter}`;
      params.push(category);
      paramCounter++;
    }

    // Filter by price range
    if (minPrice) {
      query += ` AND p.price >= $${paramCounter}`;
      params.push(parseFloat(minPrice));
      paramCounter++;
    }

    if (maxPrice) {
      query += ` AND p.price <= $${paramCounter}`;
      params.push(parseFloat(maxPrice));
      paramCounter++;
    }

    // Search by name or description
    if (search) {
      query += ` AND (p.name ILIKE $${paramCounter} OR p.description ILIKE $${paramCounter})`;
      params.push(`%${search}%`);
      paramCounter++;
    }

    query += ` GROUP BY p.id ORDER BY p.created_at DESC`;

    // Pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM (
        SELECT p.id
        FROM products p
        LEFT JOIN product_categories pc ON p.id = pc.product_id
        LEFT JOIN categories c ON pc.category_id = c.id
        WHERE 1=1
    `;
    
    const countParams = [];
    let countParamCounter = 1;

    if (category) {
      countQuery += ` AND c.slug = $${countParamCounter}`;
      countParams.push(category);
      countParamCounter++;
    }

    if (minPrice) {
      countQuery += ` AND p.price >= $${countParamCounter}`;
      countParams.push(parseFloat(minPrice));
      countParamCounter++;
    }

    if (maxPrice) {
      countQuery += ` AND p.price <= $${countParamCounter}`;
      countParams.push(parseFloat(maxPrice));
      countParamCounter++;
    }

    if (search) {
      countQuery += ` AND (p.name ILIKE $${countParamCounter} OR p.description ILIKE $${countParamCounter})`;
      countParams.push(`%${search}%`);
    }

    countQuery += ` GROUP BY p.id) as subquery`;

    const countResult = await pool.query(countQuery, countParams);
    const totalProducts = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      products: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalProducts,
        pages: Math.ceil(totalProducts / limit),
      },
    });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching products.' 
    });
  }
};

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
const getFeaturedProducts = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, 
        COALESCE(
          json_agg(
            json_build_object('id', c.id, 'name', c.name, 'slug', c.slug)
          ) FILTER (WHERE c.id IS NOT NULL), '[]'
        ) as categories
      FROM products p
      LEFT JOIN product_categories pc ON p.id = pc.product_id
      LEFT JOIN categories c ON pc.category_id = c.id
      WHERE p.is_featured = TRUE
      GROUP BY p.id
      ORDER BY p.featured_order ASC NULLS LAST, p.created_at DESC
      LIMIT 8
    `);

    res.json({
      success: true,
      products: result.rows,
    });

  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching featured products.' 
    });
  }
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT p.*, 
        COALESCE(
          json_agg(
            json_build_object('id', c.id, 'name', c.name, 'slug', c.slug)
          ) FILTER (WHERE c.id IS NOT NULL), '[]'
        ) as categories
      FROM products p
      LEFT JOIN product_categories pc ON p.id = pc.product_id
      LEFT JOIN categories c ON pc.category_id = c.id
      WHERE p.id = $1
      GROUP BY p.id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found.' 
      });
    }

    res.json({
      success: true,
      product: result.rows[0],
    });

  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching product.' 
    });
  }
};

// @desc    Create new product
// @route   POST /api/products
// @access  Private (Admin, Manager)
const createProduct = async (req, res) => {
  try {
    console.log('📝 Creating product:', req.body.name);
    console.log('📦 Full req.body:', JSON.stringify(req.body, null, 2));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { name, description, price, stock_quantity, product_code, category_ids, return_days, is_featured } = req.body;
    
    console.log('📋 Parsed category_ids:', category_ids, 'Type:', typeof category_ids);

    // Get image path from req.file (uploaded via multer)
    let imagePath = null;
    if (req.file) {
      imagePath = req.file.path; // Cloudinary returns path
      console.log('✅ Image uploaded to:', imagePath);
    } else {
      console.warn('⚠️  No image file uploaded');
    }

    // Generate product code if not provided
    let finalProductCode = product_code;
    if (!finalProductCode || finalProductCode.trim() === '') {
      const timestamp = Date.now().toString(36).toUpperCase();
      finalProductCode = `PROD-${timestamp}`;
    }

    // Check if product_code already exists
    const existingCode = await pool.query(
      'SELECT id FROM products WHERE product_code = $1',
      [finalProductCode]
    );
    
    if (existingCode.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Product code already exists.' 
      });
    }

    // Get max featured_order if is_featured is true
    let featuredOrder = null;
    if (is_featured === true || is_featured === 'true') {
      const maxOrderResult = await pool.query(
        'SELECT MAX(featured_order) as max_order FROM products WHERE is_featured = TRUE'
      );
      featuredOrder = (maxOrderResult.rows[0].max_order || 0) + 1;
    }

    // Insert product
    const result = await pool.query(`
      INSERT INTO products (name, description, price, stock_quantity, product_code, image_path, return_days, is_featured, featured_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      name, 
      description, 
      parseFloat(price), 
      parseInt(stock_quantity) || 0, 
      finalProductCode,
      imagePath,
      parseInt(return_days) || 7,
      is_featured === true || is_featured === 'true',
      featuredOrder
    ]);

    const product = result.rows[0];

    // Link categories if provided
    if (category_ids) {
      try {
        const ids = Array.isArray(category_ids) ? category_ids : JSON.parse(category_ids);
        console.log('🔗 Linking categories:', ids);
        if (Array.isArray(ids) && ids.length > 0) {
          for (const categoryId of ids) {
            await pool.query(`
              INSERT INTO product_categories (product_id, category_id)
              VALUES ($1, $2)
            `, [product.id, categoryId]);
          }
          console.log(`✅ Linked ${ids.length} categories to product ${product.id}`);
        }
      } catch (parseError) {
        console.error('❌ Error parsing category_ids:', parseError.message);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      product,
    });

  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error creating product.' 
    });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private (Admin, Manager)
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, stock_quantity, product_code, category_ids, return_days, is_featured } = req.body;

    // Check if product exists
    const existingProduct = await pool.query('SELECT id, product_code FROM products WHERE id = $1', [id]);
    
    if (existingProduct.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found.' 
      });
    }

    // Check product_code uniqueness if being changed
    if (product_code && product_code !== existingProduct.rows[0].product_code) {
      const existingCode = await pool.query(
        'SELECT id FROM products WHERE product_code = $1 AND id != $2',
        [product_code, id]
      );
      
      if (existingCode.rows.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Product code already exists.' 
        });
      }
    }

    // Handle image update
    let imagePath = req.body.image_path;
    if (req.file) {
      imagePath = req.file.path;
      
      // Delete old image from Cloudinary if it exists
      if (existingProduct.rows[0].image_path) {
        const publicId = existingProduct.rows[0].image_path.split('/').pop().split('.')[0];
        cloudinary.uploader.destroy(`sallapuradamma-textiles/products/${publicId}`, (error) => {
          if (error) console.error('Error deleting old image:', error);
        });
      }
    }

    // Handle featured_order
    let featuredOrder = req.body.featured_order;
    if (is_featured === true || is_featured === 'true') {
      if (!featuredOrder) {
        const maxOrderResult = await pool.query(
          'SELECT MAX(featured_order) as max_order FROM products WHERE is_featured = TRUE'
        );
        featuredOrder = (maxOrderResult.rows[0].max_order || 0) + 1;
      }
    } else if (is_featured === false || is_featured === 'false') {
      featuredOrder = null;
    }

    // Update product
    const result = await pool.query(`
      UPDATE products
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          price = COALESCE($3, price),
          stock_quantity = COALESCE($4, stock_quantity),
          product_code = COALESCE($5, product_code),
          image_path = COALESCE($6, image_path),
          return_days = COALESCE($7, return_days),
          is_featured = COALESCE($8, is_featured),
          featured_order = $9,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `, [
      name, 
      description, 
      price ? parseFloat(price) : null, 
      stock_quantity ? parseInt(stock_quantity) : null, 
      product_code,
      imagePath,
      return_days !== undefined ? parseInt(return_days) : null,
      is_featured !== undefined ? (is_featured === true || is_featured === 'true') : null,
      featuredOrder,
      id
    ]);

    // Update categories if provided
    if (category_ids) {
      // Remove existing category links
      await pool.query('DELETE FROM product_categories WHERE product_id = $1', [id]);
      
      // Add new category links
      const ids = Array.isArray(category_ids) ? category_ids : JSON.parse(category_ids);
      for (const categoryId of ids) {
        await pool.query(`
          INSERT INTO product_categories (product_id, category_id)
          VALUES ($1, $2)
        `, [id, categoryId]);
      }
    }

    res.json({
      success: true,
      message: 'Product updated successfully.',
      product: result.rows[0],
    });

  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error updating product.' 
    });
  }
};

// @desc    Toggle featured status
// @route   PUT /api/products/:id/featured
// @access  Private (Admin, Manager)
const toggleFeatured = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_featured } = req.body;

    const product = await pool.query('SELECT id, featured_order FROM products WHERE id = $1', [id]);
    
    if (product.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found.' 
      });
    }

    let featuredOrder = null;
    if (is_featured === true || is_featured === 'true') {
      const maxOrderResult = await pool.query(
        'SELECT MAX(featured_order) as max_order FROM products WHERE is_featured = TRUE'
      );
      featuredOrder = (maxOrderResult.rows[0].max_order || 0) + 1;
    }

    const result = await pool.query(`
      UPDATE products
      SET is_featured = $1,
          featured_order = $2
      WHERE id = $3
      RETURNING *
    `, [is_featured === true || is_featured === 'true', featuredOrder, id]);

    res.json({
      success: true,
      message: 'Product featured status updated.',
      product: result.rows[0],
    });

  } catch (error) {
    console.error('Toggle featured error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating featured status.' 
    });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private (Admin, Manager)
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Get product to delete old image
    const product = await pool.query('SELECT image_path FROM products WHERE id = $1', [id]);

    if (product.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found.' 
      });
    }

    // Delete image from Cloudinary if exists
    if (product.rows[0].image_path) {
      const publicId = product.rows[0].image_path.split('/').pop().split('.')[0];
      cloudinary.uploader.destroy(`sallapuradamma-textiles/products/${publicId}`, (error) => {
        if (error) console.error('Error deleting image:', error);
      });
    }

    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);

    res.json({
      success: true,
      message: 'Product deleted successfully.',
    });

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting product.' 
    });
  }
};

module.exports = {
  getAllProducts,
  getFeaturedProducts,
  getProductById,
  createProduct,
  updateProduct,
  toggleFeatured,
  deleteProduct,
};