const { User } = require('../models');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const authService = require('../services/authService');

// Check if username exists
exports.checkUsernameExists = async (username) => {
  return await authService.checkUsernameExists(username);
};

// Check if email exists
exports.checkEmailExists = async (email) => {
  return await authService.checkEmailExists(email);
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
    // Register user using the service
    await authService.registerUser(req.body);

    req.flash('success_msg', 'You are now registered and can log in');
    res.redirect('/auth/login');
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.message.includes('Username is already taken')) {
      req.flash('error_msg', 'Username is already taken');
    } else if (error.message.includes('Email is already registered')) {
      req.flash('error_msg', 'Email is already registered');
    } else {
      req.flash('error_msg', 'An error occurred during registration');
    }
    
    res.redirect('/auth/register');
  }
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    // Get user profile using the service
    const user = await authService.getUserProfile(req.user.id);

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
    // Update profile using the service
    await authService.updateUserProfile(req.user.id, req.body);

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
    
    // Change password using the service
    await authService.changePassword(req.user.id, currentPassword, newPassword);

    req.flash('success_msg', 'Password changed successfully');
    res.redirect('/auth/profile');
  } catch (error) {
    console.error('Password change error:', error);
    
    if (error.message === 'Current password is incorrect') {
      req.flash('error_msg', 'Current password is incorrect');
    } else {
      req.flash('error_msg', 'An error occurred while changing your password');
    }
    
    res.redirect('/auth/profile');
  }
};