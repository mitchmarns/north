// services/relationshipService.js

const { Relationship, Character, User, Sequelize } = require('../models');
const Op = Sequelize.Op;
const discordNotifier = require('../utils/discordNotifier');

/**
 * Get all relationships for a character
 * @param {number} characterId - The character ID
 * @param {number} userId - The user ID
 * @returns {Object} Character relationships and other character data
 */
exports.getCharacterRelationships = async (characterId, userId) => {
  // Get the character
  const character = await Character.findByPk(characterId);
  
  if (!character) {
    throw new Error('Character not found');
  }
  
  // Check if user owns the character
  if (character.userId !== userId) {
    throw new Error('Not authorized');
  }
  
  // Get relationships
  const relationships = await Relationship.findAll({
    where: {
      [Op.or]: [
        { character1Id: character.id },
        { character2Id: character.id }
      ]
    },
    include: [
      {
        model: Character,
        as: 'character1',
        include: [{ model: User, attributes: ['username'] }]
      },
      {
        model: Character,
        as: 'character2',
        include: [{ model: User, attributes: ['username'] }]
      },
      {
        model: User,
        as: 'requestedBy',
        attributes: ['username']
      }
    ]
  });
  
  // Format relationships for display
  let formattedRelationships = [];
  if (relationships && relationships.length > 0) {
    formattedRelationships = relationships.map(rel => {
      const isCharacter1 = rel.character1Id === parseInt(characterId);
      const otherCharacter = isCharacter1 ? rel.character2 : rel.character1;
      return {
        id: rel.id,
        otherCharacter: otherCharacter,
        relationshipType: rel.relationshipType,
        description: rel.description,
        status: rel.status || 'Neutral',
        isPending: rel.isPending || false,
        isApproved: rel.isApproved || false,
        canEdit: otherCharacter.userId === userId || character.userId === userId,
        otherUserName: otherCharacter.User ? otherCharacter.User.username : 'Unknown'
      };
    });
  }
  
  // Get user's other characters for relationship creation
  const userCharacters = await Character.findAll({
    where: {
      userId: userId,
      id: {
        [Op.ne]: character.id
      },
      isArchived: false
    }
  });
  
  // Get public characters from other users
  const otherUsersCharacters = await Character.findAll({
    where: {
      userId: {
        [Op.ne]: userId
      },
      isPrivate: false,
      isArchived: false
    },
    include: [
      {
        model: User,
        attributes: ['username']
      }
    ],
    limit: 50
  });
  
  return {
    character,
    relationships: formattedRelationships,
    userCharacters,
    otherUsersCharacters
  };
};

/**
 * Add a relationship between characters
 * @param {number} character1Id - First character ID
 * @param {number} character2Id - Second character ID 
 * @param {Object} relationshipData - Relationship details
 * @param {number} userId - User ID who requested
 * @returns {Object} The created relationship
 */
exports.addRelationship = async (character1Id, character2Id, relationshipData, userId) => {
  // Verify characters exist
  const character1 = await Character.findByPk(character1Id);
  const character2 = await Character.findByPk(character2Id);
  
  if (!character1 || !character2) {
    throw new Error('One or both characters not found');
  }
  
  // Check if user owns the first character
  if (character1.userId !== userId) {
    throw new Error('Not authorized to create relationships for this character');
  }
  
  // Check if relationship already exists
  const existingRelationship = await Relationship.findOne({
    where: {
      [Op.or]: [
        {
          character1Id: character1Id,
          character2Id: character2Id
        },
        {
          character1Id: character2Id,
          character2Id: character1Id
        }
      ]
    }
  });
  
  if (existingRelationship) {
    throw new Error('Relationship already exists');
  }
  
  // Determine if this is a self-relationship or cross-user relationship
  const isSelfRelationship = character1.userId === character2.userId;
  
  const { relationshipType, description, status } = relationshipData;
  
  // Create relationship with appropriate status
  const newRelationship = await Relationship.create({
    character1Id,
    character2Id,
    relationshipType,
    description: description || null,
    status: status || 'Neutral',
    isPending: !isSelfRelationship,  // Only pending if it involves another user's character
    isApproved: isSelfRelationship,  // Auto-approved if both characters belong to the same user
    requestedById: userId
  });
  
  // If it's a cross-user relationship that needs approval, send notification
  if (!isSelfRelationship) {
    try {
      // Load characters with user data for the notification
      const char1WithUser = await Character.findByPk(character1Id, {
        include: [{ model: User, attributes: ['username'] }]
      });
      
      const char2WithUser = await Character.findByPk(character2Id, {
        include: [{ model: User, attributes: ['username'] }]
      });
      
      // Send Discord notification
      discordNotifier.sendNotification(
        `New relationship request!`,
        {
          embeds: [{
            title: `Relationship Request: ${char1WithUser.name} → ${char2WithUser.name}`,
            description: `${char1WithUser.name} wants to be ${relationshipType} with ${char2WithUser.name}`,
            color: 0xffc107, // Warning color
            fields: [
              { name: 'Requester', value: `${char1WithUser.User.username}`, inline: true },
              { name: 'Target', value: `${char2WithUser.User.username}`, inline: true },
              { name: 'Status', value: status || 'Neutral', inline: true }
            ],
            timestamp: new Date()
          }]
        }
      );
    } catch (notificationError) {
      console.error('Error sending relationship notification:', notificationError);
      // Continue execution even if notification fails
    }
  }
  
  return newRelationship;
};

/**
 * Get all pending relationship requests for a user
 * @param {number} userId - The user ID
 * @returns {Array} Formatted pending relationship requests
 */
exports.getPendingRequests = async (userId) => {
  // Get all characters owned by the user
  const userCharacters = await Character.findAll({
    where: {
      userId: userId
    }
  });
  
  // Get IDs of all user's characters
  const characterIds = userCharacters.map(char => char.id);
  
  // Find pending relationships involving user's characters
  const pendingRelationships = await Relationship.findAll({
    where: {
      [Op.or]: [
        {
          character1Id: { [Op.in]: characterIds },
          isPending: true,
          requestedById: { [Op.ne]: userId }
        },
        {
          character2Id: { [Op.in]: characterIds },
          isPending: true,
          requestedById: { [Op.ne]: userId }
        }
      ]
    },
    include: [
      {
        model: Character,
        as: 'character1',
        include: [{ model: User, attributes: ['username'] }]
      },
      {
        model: Character,
        as: 'character2',
        include: [{ model: User, attributes: ['username'] }]
      },
      {
        model: User,
        as: 'requestedBy',
        attributes: ['username']
      }
    ]
  });
  
  // Format relationships for display
  const formattedRequests = pendingRelationships.map(rel => {
    // Determine which character belongs to the current user
    const userCharacter = characterIds.includes(rel.character1Id) 
      ? rel.character1 
      : rel.character2;
    
    // Determine which character belongs to the other user
    const otherCharacter = userCharacter.id === rel.character1Id
      ? rel.character2
      : rel.character1;
    
    return {
      id: rel.id,
      userCharacter: userCharacter,
      otherCharacter: otherCharacter,
      relationshipType: rel.relationshipType,
      description: rel.description,
      status: rel.status,
      requestedBy: rel.requestedBy ? rel.requestedBy.username : 'Unknown'
    };
  });
  
  return formattedRequests;
};

/**
 * Approve a relationship request
 * @param {number} relationshipId - The relationship ID
 * @param {number} userId - The user ID approving the request
 * @returns {Object} The updated relationship
 */
exports.approveRelationship = async (relationshipId, userId) => {
  // Find relationship
  const relationship = await Relationship.findByPk(relationshipId, {
    include: [
      {
        model: Character,
        as: 'character1'
      },
      {
        model: Character,
        as: 'character2'
      }
    ]
  });
  
  if (!relationship) {
    throw new Error('Relationship not found');
  }
  
  // Check if relationship is pending
  if (!relationship.isPending) {
    throw new Error('This relationship is not pending approval');
  }
  
  // Check if user owns one of the characters
  const userOwnsCharacter1 = relationship.character1.userId === userId;
  const userOwnsCharacter2 = relationship.character2.userId === userId;
  
  if (!userOwnsCharacter1 && !userOwnsCharacter2) {
    throw new Error('Not authorized to approve this relationship');
  }
  
  // Check if user is not the requester
  if (relationship.requestedById === userId) {
    throw new Error('You cannot approve your own relationship request');
  }
  
  // Update relationship
  await relationship.update({
    isPending: false,
    isApproved: true
  });

  // Send notification
  try {
    // Get requestor info
    const requestor = await User.findByPk(relationship.requestedById);
    
    // Send Discord notification
    discordNotifier.sendNotification(
      `Relationship approved!`,
      {
        embeds: [{
          title: `Relationship Approved: ${relationship.character1.name} & ${relationship.character2.name}`,
          description: `A relationship has been approved: ${relationship.relationshipType}`,
          color: 0x28a745, // Success color
          fields: [
            { name: 'Requested By', value: requestor ? requestor.username : 'Unknown', inline: true },
            { name: 'Approved By', value: userOwnsCharacter1 ? relationship.character1.User?.username : relationship.character2.User?.username, inline: true },
            { name: 'Status', value: relationship.status || 'Neutral', inline: true }
          ],
          timestamp: new Date()
        }]
      }
    );
  } catch (notificationError) {
    console.error('Error sending relationship approval notification:', notificationError);
    // Continue execution even if notification fails
  }
  
  return relationship;
};

/**
 * Decline a relationship request
 * @param {number} relationshipId - The relationship ID
 * @param {number} userId - The user ID declining the request
 * @returns {boolean} Success status
 */
exports.declineRelationship = async (relationshipId, userId) => {
  // Find relationship
  const relationship = await Relationship.findByPk(relationshipId, {
    include: [
      {
        model: Character,
        as: 'character1'
      },
      {
        model: Character,
        as: 'character2'
      }
    ]
  });
  
  if (!relationship) {
    throw new Error('Relationship not found');
  }
  
  // Check if relationship is pending
  if (!relationship.isPending) {
    throw new Error('This relationship is not pending approval');
  }
  
  // Check if user owns one of the characters
  const userOwnsCharacter1 = relationship.character1.userId === userId;
  const userOwnsCharacter2 = relationship.character2.userId === userId;
  
  if (!userOwnsCharacter1 && !userOwnsCharacter2) {
    throw new Error('Not authorized to decline this relationship');
  }
  
  // Check if user is not the requester
  if (relationship.requestedById === userId) {
    throw new Error('You cannot decline your own relationship request');
  }
  
  // Delete relationship
  await relationship.destroy();
  
  // Send notification
  try {
    // Get requestor info
    const requestor = await User.findByPk(relationship.requestedById);
    
    // Send Discord notification
    discordNotifier.sendNotification(
      `Relationship declined`,
      {
        embeds: [{
          title: `Relationship Declined: ${relationship.character1.name} & ${relationship.character2.name}`,
          description: `A relationship request has been declined: ${relationship.relationshipType}`,
          color: 0xdc3545, // Danger color
          fields: [
            { name: 'Requested By', value: requestor ? requestor.username : 'Unknown', inline: true },
            { name: 'Declined By', value: userOwnsCharacter1 ? relationship.character1.User?.username : relationship.character2.User?.username, inline: true }
          ],
          timestamp: new Date()
        }]
      }
    );
  } catch (notificationError) {
    console.error('Error sending relationship decline notification:', notificationError);
    // Continue execution even if notification fails
  }
  
  return true;
};

/**
 * Update an existing relationship
 * @param {number} relationshipId - The relationship ID
 * @param {Object} relationshipData - Updated relationship data
 * @param {number} userId - The user ID
 * @returns {Object} The updated relationship
 */
exports.updateRelationship = async (relationshipId, relationshipData, userId) => {
  const { relationshipType, description, status } = relationshipData;
  
  // Find relationship
  const relationship = await Relationship.findByPk(relationshipId, {
    include: [
      {
        model: Character,
        as: 'character1'
      },
      {
        model: Character,
        as: 'character2'
      }
    ]
  });
  
  if (!relationship) {
    throw new Error('Relationship not found');
  }
  
  // Check if user owns at least one of the characters
  if (relationship.character1.userId !== userId && relationship.character2.userId !== userId) {
    throw new Error('Not authorized to update this relationship');
  }
  
  // Update relationship
  await relationship.update({
    relationshipType,
    description: description || null,
    status: status || 'Neutral'
  });
  
  return relationship;
};

/**
 * Delete a relationship
 * @param {number} relationshipId - The relationship ID
 * @param {number} userId - The user ID
 * @returns {boolean} Success status
 */
exports.deleteRelationship = async (relationshipId, userId) => {
  // Find relationship
  const relationship = await Relationship.findByPk(relationshipId, {
    include: [
      {
        model: Character,
        as: 'character1'
      },
      {
        model: Character,
        as: 'character2'
      }
    ]
  });
  
  if (!relationship) {
    throw new Error('Relationship not found');
  }
  
  // Check if user owns at least one of the characters
  if (relationship.character1.userId !== userId && relationship.character2.userId !== userId) {
    throw new Error('Not authorized to delete this relationship');
  }
  
  // Delete relationship
  await relationship.destroy();
  
  return true;
};

/**
 * Check if there is a relationship between two characters
 * @param {number} character1Id - The first character ID
 * @param {number} character2Id - The second character ID
 * @returns {Object|null} The relationship or null if none exists
 */
exports.checkRelationshipExists = async (character1Id, character2Id) => {
  return await Relationship.findOne({
    where: {
      [Op.or]: [
        {
          character1Id: character1Id,
          character2Id: character2Id
        },
        {
          character1Id: character2Id,
          character2Id: character1Id
        }
      ],
      isApproved: true
    }
  });
};