const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');

/**
 * Generate JWT Token Helper
 */
const generateToken = (id) => {
  const secret = process.env.JWT_SECRET || 'taskflow_semester_secret_key_2026';
  return jwt.sign({ id }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user account
 * @access  Public
 */
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // 1. Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide full name, email address, and password.'
      });
    }

    const trimmedName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // 2. Check if user already exists in Supabase
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', cleanEmail)
      .single();

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    // 3. Hash password using bcryptjs
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Insert into Supabase users table
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        name: trimmedName,
        email: cleanEmail,
        password: hashedPassword
      });

    if (insertError) {
      console.error('[Supabase Register Insert Error]:', insertError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create user account. Please try again.'
      });
    }

    // Fetch the newly created record to get its generated ID
    const { data: createdUser } = await supabase
      .from('users')
      .select('id, name, email, created_at')
      .eq('email', cleanEmail)
      .single();

    const userPayload = createdUser || { name: trimmedName, email: cleanEmail };
    const token = generateToken(userPayload.id);

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: {
        id: userPayload.id,
        name: userPayload.name,
        email: userPayload.email
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user credentials and issue JWT
 * @access  Public
 */
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 2. Query user from Supabase
    const { data: user, error: queryError } = await supabase
      .from('users')
      .select('*')
      .eq('email', cleanEmail)
      .single();

    if (queryError || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // 3. Compare password hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // 4. Issue JWT
    const token = generateToken(user.id);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser
};
