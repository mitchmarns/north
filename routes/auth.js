const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const passport = require('passport');
const authController = require('../controllers/authController');
const { isAuthenticated, isNotAuthenticated } = require('../middleware/auth');

// Register Page
router.get('/register', isNotAuthenticated, (req, res) => {
  res.render('register', {
    title: 'Create an Account',
    user: {} 
  });
});

// Login Page
router.get('/login', isNotAuthenticated, (req, res) => {
  res.render('login', {
    title: 'Login'
  });
});

// Register User
router.post('/register', [
  // Validation
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[A-Za-z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores and hyphens')
    .custom(async (value) => {
      const exists = await authController.checkUsernameExists(value);
      if (exists) {
        throw new Error('Username is already taken');
      }
      return true;
    }),
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail()
    .custom(async (value) => {
      const exists = await authController.checkEmailExists(value);
      if (exists) {
        throw new Error('Email is already registered');
      }
      return true;
    }),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('password2')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
], authController.register);

// Login User
router.post('/login', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/auth/login',
    failureFlash: true
  })(req, res, next);
});

// Logout User
router.get('/logout', isAuthenticated, (req, res) => {
  req.logout(function(err) {
    if (err) { 
      return next(err); 
    }
    req.flash('success_msg', 'You are logged out');
    res.redirect('/auth/login');
  });
});

// Profile Page
router.get('/profile', isAuthenticated, authController.getProfile);

// Update Profile
router.put('/profile', isAuthenticated, [
  body('displayName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Display name cannot exceed 50 characters'),
  body('bio')
    .optional()
    .trim()
], authController.updateProfile);

// Change Password
router.put('/change-password', isAuthenticated, [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
], authController.changePassword);

module.exports = router;