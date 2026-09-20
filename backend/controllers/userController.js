const bcrypt = require('bcryptjs');
const { supabase } = require('../config/supabase');

/**
 * @route   GET /api/users/profile
 * @desc    Get current user profile
 * @access  Private
 */
const getUserProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, created_at')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.'
      });
    }

    return res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile name and/or password
 * @access  Private
 */
const updateUserProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, currentPassword, newPassword } = req.body;

    const updates = {};

    if (name && name.trim() !== '') {
      updates.name = name.trim();
    }

    // Handle password change if requested
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required to set a new password.'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters long.'
        });
      }

      // Fetch user's existing password hash
      const { data: user, error } = await supabase
        .from('users')
        .select('password')
        .eq('id', userId)
        .single();

      if (error || !user) {
        return res.status(404).json({
          success: false,
          message: 'User not found.'
        });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Current password does not match our records.'
        });
      }

      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(newPassword, salt);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No profile changes provided.'
      });
    }

    const { error: updateError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId);

    if (updateError) {
      console.error('[Supabase updateUserProfile Error]:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update profile.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: userId,
        name: updates.name || req.user.name,
        email: req.user.email
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile
};
