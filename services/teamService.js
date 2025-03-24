// services/teamService.js

const { Team, Character, Sequelize } = require('../models');

/**
 * Get all active teams
 * @returns {Array} List of active teams
 */
exports.getActiveTeams = async () => {
  return await Team.findAll({
    where: { 
      isActive: true
    },
    order: [['name', 'ASC']]
  });
};

/**
 * Get all teams with player and staff counts
 * @returns {Array} Teams with counts
 */
exports.getAllTeamsWithCounts = async () => {
  const teams = await Team.findAll({
    where: { 
      isActive: true
    },
    order: [['name', 'ASC']]
  });

  // Count players and staff for each team
  for (let team of teams) {
    try {
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
    } catch (countError) {
      console.error('Error counting team members:', countError);
      team.playerCount = 0;
      team.staffCount = 0;
    }
  }

  return teams;
};

/**
 * Get a single team with player and staff counts
 * @param {number} teamId - The team ID
 * @returns {Object} Team with counts and featured players
 */
exports.getTeamWithDetails = async (teamId) => {
  const team = await Team.findByPk(teamId);

  if (!team) {
    throw new Error('Team not found');
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

  return {
    team,
    playerCount,
    staffCount,
    featuredPlayers
  };
};

// Add more team service methods as needed