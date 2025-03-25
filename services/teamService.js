// services/teamService.js

const { Team, Character, User, Sequelize } = require('../models');
const Op = Sequelize.Op;
const discordNotifier = require('../utils/discordNotifier');

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

/**
 * Get team roster with players and staff
 * @param {number} teamId - The team ID
 * @returns {Object} Team roster data
 */
exports.getTeamRoster = async (teamId) => {
  const team = await Team.findByPk(teamId);

  if (!team) {
    throw new Error('Team not found');
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

  return {
    team,
    players,
    staff,
    playerCount: players.length,
    staffCount: staff.length
  };
};

/**
 * Create a new team
 * @param {Object} teamData - Team data
 * @returns {Object} The created team
 */
exports.createTeam = async (teamData) => {
  const {
    name, shortName, city, foundedYear, description,
    primaryColor, secondaryColor, tertiaryColor, logo, isActive
  } = teamData;

  // Validate required fields
  if (!name || !shortName || !city) {
    throw new Error('Name, short name, and city are required');
  }

  // Check if team name already exists
  const existingTeam = await Team.findOne({
    where: {
      [Op.or]: [
        { name: name },
        { shortName: shortName }
      ]
    }
  });

  if (existingTeam) {
    throw new Error('A team with that name or short name already exists');
  }

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
    isActive: isActive === 'on' || isActive === true
  });

  // Send notification
  try {
    discordNotifier.sendNotification(
      `New team created!`,
      {
        embeds: [{
          title: `New Team: ${team.name}`,
          description: team.description || 'No description provided',
          color: 0x5a8095, // Your site's header color
          fields: [
            { name: 'Location', value: team.city, inline: true },
            { name: 'Founded', value: team.foundedYear ? team.foundedYear.toString() : 'Unknown', inline: true },
            { name: 'Status', value: team.isActive ? 'Active' : 'Inactive', inline: true }
          ],
          thumbnail: {
            url: team.logo || ''
          },
          timestamp: new Date()
        }]
      }
    );
  } catch (notificationError) {
    console.error('Error sending team creation notification:', notificationError);
    // Continue execution even if notification fails
  }

  return team;
};

/**
 * Update an existing team
 * @param {number} teamId - The team ID
 * @param {Object} teamData - Updated team data
 * @returns {Object} The updated team
 */
exports.updateTeam = async (teamId, teamData) => {
  const {
    name, shortName, city, foundedYear, description,
    primaryColor, secondaryColor, tertiaryColor, logo, isActive
  } = teamData;

  // Find team
  const team = await Team.findByPk(teamId);
  
  if (!team) {
    throw new Error('Team not found');
  }

  // Check if name or shortName changed and if it conflicts with existing teams
  if ((name && name !== team.name) || (shortName && shortName !== team.shortName)) {
    const existingTeam = await Team.findOne({
      where: {
        id: { [Op.ne]: teamId },
        [Op.or]: [
          { name: name || team.name },
          { shortName: shortName || team.shortName }
        ]
      }
    });

    if (existingTeam) {
      throw new Error('A team with that name or short name already exists');
    }
  }

  // Update team
  await team.update({
    name: name || team.name,
    shortName: shortName || team.shortName,
    city: city || team.city,
    foundedYear: foundedYear || team.foundedYear,
    description: description !== undefined ? description : team.description,
    primaryColor: primaryColor !== undefined ? primaryColor : team.primaryColor,
    secondaryColor: secondaryColor !== undefined ? secondaryColor : team.secondaryColor,
    tertiaryColor: tertiaryColor !== undefined ? tertiaryColor : team.tertiaryColor,
    logo: logo || team.logo,
    isActive: isActive === 'on' || isActive === true
  });

  return team;
};

/**
 * Delete a team
 * @param {number} teamId - The team ID
 * @returns {boolean} Success status
 */
exports.deleteTeam = async (teamId) => {
  // Find team
  const team = await Team.findByPk(teamId);
  
  if (!team) {
    throw new Error('Team not found');
  }
  
  // Check if team has any characters
  const characterCount = await Character.count({
    where: {
      teamId: team.id
    }
  });
  
  if (characterCount > 0) {
    throw new Error(`Cannot delete ${team.name} because it has ${characterCount} associated characters. Remove all characters from this team first.`);
  }
  
  // Delete team
  await team.destroy();
  
  return true;
};

/**
 * Get team members
 * @param {number} teamId - The team ID
 * @param {string} role - Role filter (optional, can be 'Player', 'Staff', or null for all)
 * @returns {Array} Team members
 */
exports.getTeamMembers = async (teamId, role = null) => {
  const whereClause = {
    teamId: teamId,
    isArchived: false
  };
  
  if (role) {
    whereClause.role = role;
  }
  
  return await Character.findAll({
    where: whereClause,
    include: [
      {
        model: User,
        attributes: ['username']
      }
    ],
    order: role === 'Player' ? [['jerseyNumber', 'ASC'], ['name', 'ASC']] : [['name', 'ASC']]
  });
};