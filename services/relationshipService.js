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

// Add more relationship service methods (approve, decline, update, delete, etc.)