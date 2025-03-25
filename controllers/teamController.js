const { Team, Character, User, Sequelize } = require('../models');
const teamService = require('../services/teamService');
const { validationResult } = require('express-validator');
const teamCache = new Map(); 
const CACHE_EXPIRY = 30 * 60 * 1000; 

// Get all teams (public)
exports.getAllTeams = async (req, res) => {
  try {
    // Get teams with counts using the service
    const teams = await teamService.getAllTeamsWithCounts();

    res.render('teams/index', {
      title: 'Teams Directory',
      teams
    });
  } catch (error) {
    console.error('Error fetching teams:', error);
    req.flash('error_msg', 'An error occurred while fetching teams');
    res.redirect('/');
  }
};

// Get single team
exports.getTeam = async (req, res) => {
  try {
    // Get team details using the service
    const teamData = await teamService.getTeamWithDetails(req.params.id);

    res.render('teams/view', {
      title: teamData.team.name,
      ...teamData
    });
  } catch (error) {
    console.error('Error fetching team:', error);
    
    if (error.message === 'Team not found') {
      req.flash('error_msg', 'Team not found');
    } else {
      req.flash('error_msg', 'An error occurred while fetching the team');
    }
    
    res.redirect('/teams');
  }
};

// Get team roster
exports.getTeamRoster = async (req, res) => {
  try {
    // Get team roster using the service
    const rosterData = await teamService.getTeamRoster(req.params.id);

    res.render('teams/roster', {
      title: `${rosterData.team.name} Roster`,
      ...rosterData
    });
  } catch (error) {
    console.error('Error fetching team roster:', error);
    
    if (error.message === 'Team not found') {
      req.flash('error_msg', 'Team not found');
    } else {
      req.flash('error_msg', 'An error occurred while fetching the team roster');
    }
    
    res.redirect('/teams');
  }
};

// Get all teams for authenticated users
exports.getUserTeams = async (req, res) => {
  try {
    // Get all teams with counts
    const teams = await teamService.getAllTeamsWithCounts();

    res.render('teams/user-teams', {
      title: 'Team Management',
      teams
    });
  } catch (error) {
    console.error('Error fetching teams:', error);
    req.flash('error_msg', 'An error occurred while fetching teams');
    res.redirect('/dashboard');
  }
};

// Get team creation form
exports.getCreateTeam = (req, res) => {
  res.render('teams/create', {
    title: 'Create a New Team'
  });
};

// Create team
exports.createTeam = async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.render('teams/create', {
      title: 'Create a New Team',
      errors: errors.array(),
      team: req.body
    });
  }

  try {
    // Add the current user's info to the team creation data
    const teamData = {
      ...req.body,
      createdBy: req.user.id // Optional: track who created the team
    };

    // Create team using the service
    const team = await teamService.createTeam(teamData);

    req.flash('success_msg', `${team.name} has been created successfully`);
    res.redirect(`/teams/${team.id}`);
  } catch (error) {
    console.error('Error creating team:', error);
    
    if (error.message.includes('already exists')) {
      req.flash('error_msg', error.message);
    } else {
      req.flash('error_msg', 'An error occurred while creating the team');
    }
    
    res.redirect('/teams/create');
  }
};

// Get team edit form
exports.getEditTeam = async (req, res) => {
  try {
    // Get team with details using the service
    const teamData = await teamService.getTeamWithDetails(req.params.id);

    // Optional: Add a check to ensure the user has permission to edit
    // For now, all authenticated users can edit
    res.render('teams/edit', {
      title: `Edit ${teamData.team.name}`,
      ...teamData
    });
  } catch (error) {
    console.error('Error fetching team for edit:', error);
    
    if (error.message === 'Team not found') {
      req.flash('error_msg', 'Team not found');
    } else {
      req.flash('error_msg', 'An error occurred while fetching the team');
    }
    
    res.redirect('/teams');
  }
};

// Update team
exports.updateTeam = async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.render('teams/edit', {
      title: 'Edit Team',
      errors: errors.array(),
      team: {
        ...req.body,
        id: req.params.id
      }
    });
  }

  try {
    // Update team using the service
    const team = await teamService.updateTeam(req.params.id, req.body);

    req.flash('success_msg', `${team.name} has been updated successfully`);
    res.redirect(`/teams/${team.id}`);
  } catch (error) {
    console.error('Error updating team:', error);
    
    if (error.message === 'Team not found' || error.message.includes('already exists')) {
      req.flash('error_msg', error.message);
    } else {
      req.flash('error_msg', 'An error occurred while updating the team');
    }
    
    res.redirect(`/teams/edit/${req.params.id}`);
  }
};

// Delete team (with additional safety checks)
exports.deleteTeam = async (req, res) => {
  try {
    // Delete team using the service
    await teamService.deleteTeam(req.params.id);

    req.flash('success_msg', 'Team has been deleted successfully');
    res.redirect('/teams');
  } catch (error) {
    console.error('Error deleting team:', error);
    
    if (error.message.includes('not found') || error.message.includes('Cannot delete')) {
      req.flash('error_msg', error.message);
    } else {
      req.flash('error_msg', 'An error occurred while deleting the team');
    }
    
    res.redirect('/teams');
  }
};