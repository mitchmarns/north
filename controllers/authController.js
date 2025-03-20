const { User } = require('../models');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');

// Check if username exists
exports.checkUsernameExists = async (username) => {
  const user = await User.findOne({ where: { username } });
  return !!user;
};

// Check if email exists
exports.checkEmailExists = async (email) => {
  const user = await User.findOne({ where: { email } });
  return !!user;
};

// Register user
exports.register = async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.render('register', {
      title: 'Create an Account',
      errors: errors.array(),
      user: {
        username: req.body.username,
        email: req.body.email,
        displayName: req.body.displayName || ''
      }
    });
  }

  try {
    const { username, email, password, displayName } = req.body;
    
    // Create user
    const user = await User.create({
      username,
      email,
      password, // Will be hashed by the model hooks
      displayName: displayName || username,
      lastLogin: new Date()
    });

    req.flash('success_msg', 'You are now registered and can log in');
    res.redirect('/auth/login');
  } catch (error) {
    console.error('Registration error:', error);
    req.flash('error_msg', 'An error occurred during registration');
    res.redirect('/auth/register');
  }
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    // Get user with associated characters
    const user = await User.findByPk(req.user.id, {
      include: ['characters']
    });

    if (!user) {
      req.flash('error_msg', 'User not found');
      return res.redirect('/dashboard');
    }

    res.render('profile', {
      title: 'Your Profile',
      user
    });
  } catch (error) {
    console.error('Profile error:', error);
    req.flash('error_msg', 'An error occurred while fetching your profile');
    res.redirect('/dashboard');
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { displayName, bio } = req.body;
    
    // Update user
    await User.update(
      { displayName, bio },
      { where: { id: req.user.id } }
    );

    req.flash('success_msg', 'Profile updated successfully');
    res.redirect('/auth/profile');
  } catch (error) {
    console.error('Profile update error:', error);
    req.flash('error_msg', 'An error occurred while updating your profile');
    res.redirect('/auth/profile');
  }
};

// Change password
exports.changePassword = async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { currentPassword, newPassword } = req.body;
    
    // Get user
    const user = await User.findByPk(req.user.id);
    
    // Check current password
    const isMatch = await user.validPassword(currentPassword);
    
    if (!isMatch) {
      req.flash('error_msg', 'Current password is incorrect');
      return res.redirect('/auth/profile');
    }
    
    // Update password
    user.password = newPassword;
    await user.save();

    req.flash('success_msg', 'Password changed successfully');
    res.redirect('/auth/profile');
  } catch (error) {
    console.error('Password change error:', error);
    req.flash('error_msg', 'An error occurred while changing your password');
    res.redirect('/auth/profile');
  }
};