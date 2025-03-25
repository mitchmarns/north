// routes/teams.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const teamController = require('../controllers/teamController');
const { isAuthenticated } = require('../middleware/auth');

// Public routes (no authentication required)
router.get('/', teamController.getAllTeams);
router.get('/:id', teamController.getTeam);
router.get('/:id/roster', teamController.getTeamRoster);

// Authenticated routes for team management
router.get('/my-teams', isAuthenticated, teamController.getUserTeams);

// Team creation routes
router.get('/create', isAuthenticated, teamController.getCreateTeam);
router.post('/create', isAuthenticated, [
  // Validation middleware
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Team name is required and cannot exceed 100 characters'),
  body('shortName')
    .trim()
    .isLength({ min: 1, max: 10 })
    .withMessage('Short name is required and cannot exceed 10 characters'),
  body('city')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('City is required and cannot exceed 100 characters'),
  body('foundedYear')
    .optional({ nullable: true })
    .isInt({ min: 1800, max: new Date().getFullYear() })
    .withMessage('Founded year must be a valid year'),
  body('logo')
    .optional({ nullable: true })
    .isURL()
    .withMessage('Logo must be a valid URL'),
], teamController.createTeam);

// Team edit routes
router.get('/edit/:id', isAuthenticated, teamController.getEditTeam);
router.put('/edit/:id', isAuthenticated, [
  // Validation middleware (similar to create team)
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Team name is required and cannot exceed 100 characters'),
  body('shortName')
    .trim()
    .isLength({ min: 1, max: 10 })
    .withMessage('Short name is required and cannot exceed 10 characters'),
  body('city')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('City is required and cannot exceed 100 characters'),
  body('foundedYear')
    .optional({ nullable: true })
    .isInt({ min: 1800, max: new Date().getFullYear() })
    .withMessage('Founded year must be a valid year'),
  body('logo')
    .optional({ nullable: true })
    .isURL()
    .withMessage('Logo must be a valid URL'),
], teamController.updateTeam);

// Team delete route
router.delete('/:id', isAuthenticated, teamController.deleteTeam);

module.exports = router;