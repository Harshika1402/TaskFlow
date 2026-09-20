const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');

/**
 * Authentication Middleware
 * Intercepts incoming requests, extracts Bearer JWT, verifies signature,
 * and attaches authenticated user data to req.user.
 */
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extract token from header "Bearer <token>"
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const jwtSecret = process.env.JWT_SECRET || 'taskflow_semester_secret_key_2026';
      const decoded = jwt.verify(token, jwtSecret);

      // Fetch user profile from Supabase users table
      const { data: user, error } = await supabase
        .from('users')
        .select('id, name, email, created_at')
        .eq('id', decoded.id)
        .single();

      if (error || !user) {
        return res.status(401).json({
          success: false,
          message: 'User session expired or user no longer exists.'
        });
      }

      // Attach user to request object
      req.user = user;
      next();
    } catch (error) {
      console.error('[Auth Middleware Error]:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired authentication token. Please log in again.'
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authentication token provided.'
    });
  }
};

module.exports = { protect };
