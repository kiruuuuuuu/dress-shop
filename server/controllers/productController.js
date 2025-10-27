const pool = require('../config/database');
const { validationResult } = require('express-validator');

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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { name, description, price, stock_quantity, image_url, category_ids, return_days } = req.body;

    // Insert product
    const result = await pool.query(`
      INSERT INTO products (name, description, price, stock_quantity, image_url, return_days)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [name, description, parseFloat(price), parseInt(stock_quantity) || 0, image_url, parseInt(return_days) || 0]);

    const product = result.rows[0];

    // Link categories if provided
    if (category_ids && Array.isArray(category_ids)) {
      for (const categoryId of category_ids) {
        await pool.query(`
          INSERT INTO product_categories (product_id, category_id)
          VALUES ($1, $2)
        `, [product.id, categoryId]);
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
      message: 'Error creating product.' 
    });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private (Admin, Manager)
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, stock_quantity, image_url, category_ids, return_days } = req.body;

    // Check if product exists
    const existingProduct = await pool.query('SELECT id FROM products WHERE id = $1', [id]);
    
    if (existingProduct.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found.' 
      });
    }

    // Update product
    const result = await pool.query(`
      UPDATE products
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          price = COALESCE($3, price),
          stock_quantity = COALESCE($4, stock_quantity),
          image_url = COALESCE($5, image_url),
          return_days = COALESCE($6, return_days),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [name, description, price ? parseFloat(price) : null, stock_quantity ? parseInt(stock_quantity) : null, image_url, return_days !== undefined ? parseInt(return_days) : null, id]);

    // Update categories if provided
    if (category_ids && Array.isArray(category_ids)) {
      // Remove existing category links
      await pool.query('DELETE FROM product_categories WHERE product_id = $1', [id]);
      
      // Add new category links
      for (const categoryId of category_ids) {
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
      message: 'Error updating product.' 
    });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private (Admin, Manager)
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found.' 
      });
    }

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
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
