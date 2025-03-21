// routes/teams.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const teamController = require('../controllers/teamController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// Get all teams
router.get('/', teamController.getAllTeams);

// View team
router.get('/:id', teamController.getTeam);

// View team roster
router.get('/:id/roster', teamController.getTeamRoster);

// Admin routes for team management
router.get('/admin/teams', isAuthenticated, isAdmin, teamController.getAdminTeams);
router.get('/admin/teams/create', isAuthenticated, isAdmin, teamController.getCreateTeam);
router.post('/admin/teams/create', isAuthenticated, isAdmin, [
  // Validation
], teamController.createTeam);
router.get('/admin/teams/edit/:id', isAuthenticated, isAdmin, teamController.getEditTeam);
router.put('/admin/teams/edit/:id', isAuthenticated, isAdmin, [
  // Validation
], teamController.updateTeam);

module.exports = router;