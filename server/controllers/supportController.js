const pool = require('../config/database');

// @desc    Create new support ticket
// @route   POST /api/support/tickets
// @access  Private
const createTicket = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, subject, message, priority } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Subject and message are required.',
      });
    }

    const result = await pool.query(
      `INSERT INTO support_tickets (user_id, type, subject, message, priority)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, type || 'other', subject, message, priority || 'normal']
    );

    // Notify all managers and admins about new ticket
    const managersResult = await pool.query(
      `SELECT id FROM users WHERE role IN ('admin', 'manager')`
    );

    for (const manager of managersResult.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          manager.id,
          'support_ticket',
          'New Support Ticket',
          `New ${type || 'support'} ticket: ${subject}`,
          result.rows[0].id,
          'ticket',
        ]
      );
    }

    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully.',
      ticket: result.rows[0],
    });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating support ticket.',
    });
  }
};

// @desc    Get all tickets (Admin/Manager gets all, customer gets their own)
// @route   GET /api/support/tickets
// @access  Private
const getTickets = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { status, type, page = 1, limit = 20 } = req.query;

    let query = `
      SELECT t.*, u.name as user_name, u.email as user_email,
             a.name as assigned_to_name
      FROM support_tickets t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN users a ON t.assigned_to = a.id
      WHERE 1=1
    `;

    const params = [];
    let paramCounter = 1;

    // Customers can only see their own tickets
    if (userRole === 'customer') {
      query += ` AND t.user_id = $${paramCounter}`;
      params.push(userId);
      paramCounter++;
    }

    if (status) {
      query += ` AND t.status = $${paramCounter}`;
      params.push(status);
      paramCounter++;
    }

    if (type) {
      query += ` AND t.type = $${paramCounter}`;
      params.push(type);
      paramCounter++;
    }

    query += ` ORDER BY t.created_at DESC`;

    // Pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      tickets: result.rows,
    });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tickets.',
    });
  }
};

// @desc    Get single ticket with responses
// @route   GET /api/support/tickets/:id
// @access  Private
const getTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get ticket
    const ticketResult = await pool.query(
      `SELECT t.*, u.name as user_name, u.email as user_email,
              a.name as assigned_to_name
       FROM support_tickets t
       LEFT JOIN users u ON t.user_id = u.id
       LEFT JOIN users a ON t.assigned_to = a.id
       WHERE t.id = $1`,
      [id]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found.',
      });
    }

    const ticket = ticketResult.rows[0];

    // Check authorization
    if (userRole === 'customer' && ticket.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied.',
      });
    }

    // Get responses
    const responsesResult = await pool.query(
      `SELECT r.*, u.name as user_name
       FROM ticket_responses r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.ticket_id = $1
       ORDER BY r.created_at ASC`,
      [id]
    );

    ticket.responses = responsesResult.rows;

    res.json({
      success: true,
      ticket,
    });
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching ticket.',
    });
  }
};

// @desc    Add response to ticket
// @route   POST /api/support/tickets/:id/responses
// @access  Private
const addTicketResponse = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required.',
      });
    }

    // Check if ticket exists and user has access
    const ticketResult = await pool.query(
      'SELECT * FROM support_tickets WHERE id = $1',
      [id]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found.',
      });
    }

    const ticket = ticketResult.rows[0];

    if (userRole === 'customer' && ticket.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied.',
      });
    }

    const isAdmin = ['admin', 'manager'].includes(userRole);

    // Add response
    const result = await pool.query(
      `INSERT INTO ticket_responses (ticket_id, user_id, message, is_admin)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, userId, message, isAdmin]
    );

    // Update ticket status and timestamp
    if (isAdmin) {
      await pool.query(
        `UPDATE support_tickets 
         SET status = CASE WHEN status = 'open' THEN 'in_progress' ELSE status END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id]
      );
    }

    // Send notification to the other party
    const notifyUserId = isAdmin ? ticket.user_id : ticket.assigned_to;
    if (notifyUserId) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          notifyUserId,
          'ticket_response',
          'New Response to Your Ticket',
          `You have a new response on ticket: ${ticket.subject}`,
          id,
          'ticket',
        ]
      );
    }

    res.status(201).json({
      success: true,
      message: 'Response added successfully.',
      response: result.rows[0],
    });
  } catch (error) {
    console.error('Add response error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding response.',
    });
  }
};

// @desc    Update ticket status
// @route   PUT /api/support/tickets/:id/status
// @access  Private (Admin, Manager)
const updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assigned_to } = req.body;

    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value.',
      });
    }

    let query = 'UPDATE support_tickets SET updated_at = CURRENT_TIMESTAMP';
    const params = [];
    let paramCounter = 1;

    if (status) {
      query += `, status = $${paramCounter}`;
      params.push(status);
      paramCounter++;
    }

    if (assigned_to !== undefined) {
      query += `, assigned_to = $${paramCounter}`;
      params.push(assigned_to || null);
      paramCounter++;
    }

    query += ` WHERE id = $${paramCounter} RETURNING *`;
    params.push(id);

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found.',
      });
    }

    res.json({
      success: true,
      message: 'Ticket updated successfully.',
      ticket: result.rows[0],
    });
  } catch (error) {
    console.error('Update ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating ticket.',
    });
  }
};

// @desc    Get ticket statistics
// @route   GET /api/support/stats
// @access  Private (Admin, Manager)
const getTicketStats = async (req, res) => {
  try {
    // Total tickets
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM support_tickets');

    // Tickets by status
    const statusResult = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM support_tickets
      GROUP BY status
    `);

    // Tickets by type
    const typeResult = await pool.query(`
      SELECT type, COUNT(*) as count
      FROM support_tickets
      GROUP BY type
    `);

    // Recent tickets
    const recentResult = await pool.query(`
      SELECT t.*, u.name as user_name
      FROM support_tickets t
      LEFT JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      stats: {
        totalTickets: parseInt(totalResult.rows[0].total),
        byStatus: statusResult.rows,
        byType: typeResult.rows,
        recentTickets: recentResult.rows,
      },
    });
  } catch (error) {
    console.error('Get ticket stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching ticket statistics.',
    });
  }
};

module.exports = {
  createTicket,
  getTickets,
  getTicketById,
  addTicketResponse,
  updateTicketStatus,
  getTicketStats,
};

