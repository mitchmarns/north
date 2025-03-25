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

// Change these routes to be accessible by any authenticated user
router.get('/admin/teams', isAuthenticated, teamController.getAdminTeams);
router.get('/admin/teams/create', isAuthenticated, teamController.getCreateTeam);
router.post('/admin/teams/create', isAuthenticated, [
  // Validation
], teamController.createTeam);
router.get('/admin/teams/edit/:id', isAuthenticated, teamController.getEditTeam);
router.put('/admin/teams/edit/:id', isAuthenticated, [
  // Validation
], teamController.updateTeam);

module.exports = router;