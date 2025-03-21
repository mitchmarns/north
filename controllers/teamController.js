const { Team, Character, User, Sequelize } = require('../models');
const { validationResult } = require('express-validator');

// Get all teams (public)
exports.getAllTeams = async (req, res) => {
  try {
    const teams = await Team.findAll({
      where: { 
        isActive: true
      },
      order: [['name', 'ASC']]
    });

    // Count players and staff for each team
    for (let team of teams) {
      team.playerCount = await Character.count({
        where: {
          teamId: team.id,
          role: 'Player'
        }
      });
      
      team.staffCount = await Character.count({
        where: {
          teamId: team.id,
          role: 'Staff'
        }
      });
    }

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
    const team = await Team.findByPk(req.params.id);

    if (!team) {
      req.flash('error_msg', 'Team not found');
      return res.redirect('/teams');
    }

    // Count players and staff
    const playerCount = await Character.count({
      where: {
        teamId: team.id,
        role: 'Player'
      }
    });
    
    const staffCount = await Character.count({
      where: {
        teamId: team.id,
        role: 'Staff'
      }
    });

    // Get featured players (up to 6)
    const featuredPlayers = await Character.findAll({
      where: {
        teamId: team.id,
        role: 'Player',
        isPrivate: false,
        isArchived: false
      },
      include: [
        {
          model: User,
          attributes: ['username']
        }
      ],
      limit: 6,
      order: [['createdAt', 'DESC']]
    });

    res.render('teams/view', {
      title: team.name,
      team,
      playerCount,
      staffCount,
      featuredPlayers
    });
  } catch (error) {
    console.error('Error fetching team:', error);
    req.flash('error_msg', 'An error occurred while fetching the team');
    res.redirect('/teams');
  }
};

// Get team roster
exports.getTeamRoster = async (req, res) => {
  try {
    const team = await Team.findByPk(req.params.id);

    if (!team) {
      req.flash('error_msg', 'Team not found');
      return res.redirect('/teams');
    }

    // Get players
    const players = await Character.findAll({
      where: {
        teamId: team.id,
        role: 'Player',
        isArchived: false
      },
      include: [
        {
          model: User,
          attributes: ['username']
        }
      ],
      order: [
        ['jerseyNumber', 'ASC'],
        ['name', 'ASC']
      ]
    });

    // Get staff
    const staff = await Character.findAll({
      where: {
        teamId: team.id,
        role: 'Staff',
        isArchived: false
      },
      include: [
        {
          model: User,
          attributes: ['username']
        }
      ],
      order: [['name', 'ASC']]
    });

    // Count players and staff for display
    const playerCount = players.length;
    const staffCount = staff.length;

    res.render('teams/roster', {
      title: `${team.name} Roster`,
      team,
      players,
      staff,
      playerCount,
      staffCount
    });
  } catch (error) {
    console.error('Error fetching team roster:', error);
    req.flash('error_msg', 'An error occurred while fetching the team roster');
    res.redirect('/teams');
  }
};

// Admin: Get all teams for admin
exports.getAdminTeams = async (req, res) => {
  try {
    const teams = await Team.findAll({
      order: [['name', 'ASC']]
    });

    // Count players and staff for each team
    for (let team of teams) {
      team.playerCount = await Character.count({
        where: {
          teamId: team.id,
          role: 'Player'
        }
      });
      
      team.staffCount = await Character.count({
        where: {
          teamId: team.id,
          role: 'Staff'
        }
      });
    }

    res.render('teams/admin/index', {
      title: 'Team Management',
      teams
    });
  } catch (error) {
    console.error('Error fetching teams for admin:', error);
    req.flash('error_msg', 'An error occurred while fetching teams');
    res.redirect('/dashboard');
  }
};

// Admin: Get team creation form
exports.getCreateTeam = (req, res) => {
  res.render('teams/admin/create', {
    title: 'Create a New Team'
  });
};

// Admin: Create team
exports.createTeam = async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.render('teams/admin/create', {
      title: 'Create a New Team',
      errors: errors.array(),
      team: req.body
    });
  }

  try {
    const {
      name, shortName, city, foundedYear, description,
      primaryColor, secondaryColor, tertiaryColor, logo, isActive
    } = req.body;

    // Create team
    const team = await Team.create({
      name,
      shortName,
      city,
      foundedYear: foundedYear || null,
      description: description || null,
      primaryColor: primaryColor || null,
      secondaryColor: secondaryColor || null,
      tertiaryColor: tertiaryColor || null,
      logo: logo || null,
      isActive: isActive === 'on'
    });

    req.flash('success_msg', `${team.name} has been created successfully`);
    res.redirect(`/teams/${team.id}`);
  } catch (error) {
    console.error('Error creating team:', error);
    req.flash('error_msg', 'An error occurred while creating the team');
    res.redirect('/teams/admin/teams/create');
  }
};

// Admin: Get team edit form
exports.getEditTeam = async (req, res) => {
  try {
    const team = await Team.findByPk(req.params.id);

    if (!team) {
      req.flash('error_msg', 'Team not found');
      return res.redirect('/teams/admin/teams');
    }

    // Count players and staff
    const playerCount = await Character.count({
      where: {
        teamId: team.id,
        role: 'Player'
      }
    });
    
    const staffCount = await Character.count({
      where: {
        teamId: team.id,
        role: 'Staff'
      }
    });

    res.render('teams/admin/edit', {
      title: `Edit ${team.name}`,
      team,
      playerCount,
      staffCount
    });
  } catch (error) {
    console.error('Error fetching team for edit:', error);
    req.flash('error_msg', 'An error occurred while fetching the team');
    res.redirect('/teams/admin/teams');
  }
};

// Admin: Update team
exports.updateTeam = async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.render('teams/admin/edit', {
      title: 'Edit Team',
      errors: errors.array(),
      team: {
        ...req.body,
        id: req.params.id
      }
    });
  }

  try {
    // Find team
    const team = await Team.findByPk(req.params.id);
    
    if (!team) {
      req.flash('error_msg', 'Team not found');
      return res.redirect('/teams/admin/teams');
    }
    
    const {
      name, shortName, city, foundedYear, description,
      primaryColor, secondaryColor, tertiaryColor, logo, isActive
    } = req.body;

    // Update team
    await team.update({
      name,
      shortName,
      city,
      foundedYear: foundedYear || null,
      description: description || null,
      primaryColor: primaryColor || null,
      secondaryColor: secondaryColor || null,
      tertiaryColor: tertiaryColor || null,
      logo: logo || team.logo,
      isActive: isActive === 'on'
    });

    req.flash('success_msg', `${team.name} has been updated successfully`);
    res.redirect(`/teams/${team.id}`);
  } catch (error) {
    console.error('Error updating team:', error);
    req.flash('error_msg', 'An error occurred while updating the team');
    res.redirect(`/teams/admin/teams/edit/${req.params.id}`);
  }
};

// Admin: Delete team
exports.deleteTeam = async (req, res) => {
  try {
    // Find team
    const team = await Team.findByPk(req.params.id);
    
    if (!team) {
      req.flash('error_msg', 'Team not found');
      return res.redirect('/teams/admin/teams');
    }
    
    // Check if team has any characters
    const characterCount = await Character.count({
      where: {
        teamId: team.id
      }
    });
    
    if (characterCount > 0) {
      req.flash('error_msg', `Cannot delete ${team.name} because it has associated characters. Remove all characters from this team first.`);
      return res.redirect('/teams/admin/teams');
    }
    
    // Delete team
    await team.destroy();

    req.flash('success_msg', 'Team has been deleted successfully');
    res.redirect('/teams/admin/teams');
  } catch (error) {
    console.error('Error deleting team:', error);
    req.flash('error_msg', 'An error occurred while deleting the team');
    res.redirect('/teams/admin/teams');
  }
};