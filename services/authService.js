// services/authService.js

const { User } = require('../models');
const bcrypt = require('bcryptjs');

/**
 * Check if username exists
 * @param {string} username - The username to check
 * @returns {boolean} True if username exists, false otherwise
 */
exports.checkUsernameExists = async (username) => {
  const user = await User.findOne({ where: { username } });
  return !!user;
};

/**
 * Check if email exists
 * @param {string} email - The email to check
 * @returns {boolean} True if email exists, false otherwise
 */
exports.checkEmailExists = async (email) => {
  const user = await User.findOne({ where: { email } });
  return !!user;
};

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Object} The created user
 */
exports.registerUser = async (userData) => {
  const { username, email, password, displayName } = userData;
  
  // Check if username or email already exists
  const usernameExists = await exports.checkUsernameExists(username);
  if (usernameExists) {
    throw new Error('Username is already taken');
  }
  
  const emailExists = await exports.checkEmailExists(email);
  if (emailExists) {
    throw new Error('Email is already registered');
  }
  
  // Create user
  const user = await User.create({
    username,
    email,
    password, // Will be hashed by the model hooks
    displayName: displayName || username,
    lastLogin: new Date()
  });
  
  return user;
};

/**
 * Get user profile with characters
 * @param {number} userId - User ID
 * @returns {Object} User with characters
 */
exports.getUserProfile = async (userId) => {
  const user = await User.findByPk(userId, {
    include: ['characters']
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  return user;
};

/**
 * Update user profile
 * @param {number} userId - User ID
 * @param {Object} profileData - Profile data to update
 * @returns {Object} Updated user
 */
exports.updateUserProfile = async (userId, profileData) => {
  const { displayName, bio } = profileData;
  
  const user = await User.findByPk(userId);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  await User.update(
    { displayName, bio },
    { where: { id: userId } }
  );
  
  return await User.findByPk(userId);
};

/**
 * Change user password
 * @param {number} userId - User ID
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {boolean} Success status
 */
exports.changePassword = async (userId, currentPassword, newPassword) => {
  // Get user
  const user = await User.findByPk(userId);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Check current password
  const isMatch = await user.validPassword(currentPassword);
  
  if (!isMatch) {
    throw new Error('Current password is incorrect');
  }
  
  // Update password
  user.password = newPassword;
  await user.save();
  
  return true;
};