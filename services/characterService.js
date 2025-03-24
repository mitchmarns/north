// services/characterService.js

const { Character, User, Relationship, Team, CharacterGallery, sequelize, Sequelize } = require('../models');
const Op = Sequelize.Op;

/**
 * Get a character with complete relationship data
 * @param {number} characterId - The ID of the character to retrieve
 * @param {number|null} userId - The current user's ID (if authenticated)
 * @returns {Object} Character data with relationships and ownership info
 */
exports.getCharacterWithRelationships = async (characterId, userId) => {
  try {
    // Find the character with user and team data
    const character = await Character.findByPk(characterId, {
      include: [
        {
          model: User,
          attributes: ['username', 'id']
        },
        {
          model: Team
        }
      ]
    });

    if (!character) {
      throw new Error('Character not found');
    }

    // Add default values for stats
    character.strength = character.strength || 0;
    character.dexterity = character.dexterity || 0;
    character.constitution = character.constitution || 0;
    character.intelligence = character.intelligence || 0;
    character.wisdom = character.wisdom || 0;
    character.charisma = character.charisma || 0;

    // Check if character is private and not owned by user
    if (character.isPrivate && (!userId || userId !== character.userId)) {
      throw new Error('This character is private');
    }

    // Get relationships
    const relationships = await Relationship.findAll({
      where: {
        [Op.or]: [
          { character1Id: character.id },
          { character2Id: character.id }
        ],
        isApproved: true // Only show approved relationships
      },
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

    // Format relationships for display
    const formattedRelationships = relationships.map(rel => {
      const isCharacter1 = rel.character1Id === character.id;
      return {
        id: rel.id,
        otherCharacter: isCharacter1 ? rel.character2 : rel.character1,
        relationshipType: rel.relationshipType,
        description: rel.description,
        status: rel.status
      };
    });

    return {
      character,
      relationships: formattedRelationships,
      isOwner: userId === character.userId
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get user's characters for messaging
 * @param {number} userId - The user's ID
 * @param {number} targetCharacterId - The target character ID
 * @returns {Object} User's characters and messaging capability info
 */
exports.getMessagingData = async (userId, targetCharacterId) => {
  // Only get data if user is logged in
  if (!userId) {
    return {
      userCharacters: [],
      canMessage: false
    };
  }

  // Get user's characters for messaging
  const userCharacters = await Character.findAll({
    where: {
      userId: userId,
      isArchived: false
    }
  });
  
  let canMessage = false;
  
  // Check if there are relationships between any of the user's characters and this character
  if (userCharacters.length > 0) {
    const characterIds = userCharacters.map(char => char.id);
    
    const relationship = await Relationship.findOne({
      where: {
        [Op.or]: [
          {
            character1Id: { [Op.in]: characterIds },
            character2Id: targetCharacterId,
            isApproved: true
          },
          {
            character1Id: targetCharacterId,
            character2Id: { [Op.in]: characterIds },
            isApproved: true
          }
        ]
      }
    });
    
    canMessage = !!relationship;
  }

  return {
    userCharacters,
    canMessage
  };
};

/**
 * Get a list of all characters
 * @returns {Array} List of all public characters
 */
exports.getAllCharacters = async () => {
  return await Character.findAll({
    where: { 
      isPrivate: false,
      isArchived: false
    },
    include: [
      {
        model: User,
        attributes: ['username']
      }
    ],
    order: [['createdAt', 'DESC']]
  });
};

/**
 * Get a user's characters
 * @param {number} userId - The user's ID
 * @returns {Array} List of user's characters
 */
exports.getUserCharacters = async (userId) => {
  return await Character.findAll({
    where: { userId: userId },
    order: [['createdAt', 'DESC']]
  });
};

/**
 * Create a new character
 * @param {Object} characterData - Character data
 * @param {number} userId - The user's ID
 * @returns {Object} The created character
 */
exports.createCharacter = async (characterData, userId) => {
  // Extract character data
  const {
    name, nickname, age, gender, shortBio, fullBio,
    appearance, personality, background, skills,
    likes, dislikes, fears, goals, faceclaim, avatarUrl, 
    isPrivate, role, teamId, position
  } = characterData;

  // Create character
  return await Character.create({
    userId: userId,
    name,
    nickname: nickname || null,
    age: age || null,
    gender: gender || null,
    avatarUrl: avatarUrl || null,
    faceclaim: faceclaim || null,
    shortBio: shortBio || null,
    fullBio: fullBio || null,
    appearance: appearance || null,
    personality: personality || null,
    background: background || null,
    skills: skills || null,
    likes: likes || null,
    dislikes: dislikes || null,
    fears: fears || null,
    goals: goals || null,
    role: role || 'Civilian',
    teamId: (role === 'Player' || role === 'Staff') ? teamId || null : null,
    position: role === 'Player' ? position || null : null,
    isPrivate: isPrivate === 'on'
  });
};

/**
 * Update a character
 * @param {number} characterId - The ID of the character to update
 * @param {Object} characterData - Updated character data
 * @param {number} userId - The user's ID
 * @returns {Object} The updated character
 */
exports.updateCharacter = async (characterId, characterData, userId) => {
  // Find character
  const character = await Character.findByPk(characterId);
  
  if (!character) {
    throw new Error('Character not found');
  }
  
  // Check if user owns the character
  if (character.userId !== userId) {
    throw new Error('Not authorized');
  }
  
  // Extract character data
  const {
    name, nickname, age, gender, shortBio, fullBio,
    appearance, personality, background, skills,
    likes, dislikes, fears, goals, faceclaim, avatarUrl, 
    isPrivate, isArchived, role, teamId, position, jerseyNumber
  } = characterData;

  // Update character
  await character.update({
    name,
    nickname: nickname || null,
    age: age || null,
    gender: gender || null,
    avatarUrl: avatarUrl || character.avatarUrl,
    faceclaim: faceclaim || null,
    shortBio: shortBio || null,
    fullBio: fullBio || null,
    appearance: appearance || null,
    personality: personality || null,
    background: background || null,
    skills: skills || null,
    likes: likes || null,
    dislikes: dislikes || null,
    fears: fears || null,
    goals: goals || null,
    role: role || 'Civilian',
    teamId: (role === 'Player' || role === 'Staff') ? teamId || null : null,
    position: role === 'Player' ? position || null : null,
    jerseyNumber: role === 'Player' && jerseyNumber ? parseInt(jerseyNumber) : null,
    isPrivate: isPrivate === 'on',
    isArchived: isArchived === 'on'
  });

  return character;
};

/**
 * Delete a character
 * @param {number} characterId - The ID of the character to delete
 * @param {number} userId - The user's ID
 * @returns {boolean} Success status
 */
exports.deleteCharacter = async (characterId, userId) => {
  // Find character
  const character = await Character.findByPk(characterId);
  
  if (!character) {
    throw new Error('Character not found');
  }
  
  // Check if user owns the character
  if (character.userId !== userId) {
    throw new Error('Not authorized');
  }
  
  // Delete character
  await character.destroy();
  return true;
};

/**
 * Get character gallery
 * @param {number} characterId - The character ID
 * @param {number|null} userId - The current user's ID
 * @returns {Object} Gallery images and character data
 */
exports.getCharacterGallery = async (characterId, userId) => {
  // Find character
  const character = await Character.findByPk(characterId, {
    include: [
      {
        model: User,
        attributes: ['username', 'id']
      }
    ]
  });
  
  if (!character) {
    throw new Error('Character not found');
  }
  
  // Check if character is private and user is not the owner
  if (character.isPrivate && (!userId || userId !== character.userId)) {
    throw new Error('This character is private');
  }
  
  // Get gallery images
  const galleryImages = await CharacterGallery.findAll({
    where: { characterId },
    order: [['displayOrder', 'ASC'], ['createdAt', 'DESC']]
  });
  
  return {
    character,
    galleryImages,
    isOwner: userId === character.userId
  };
};

// Add more services for relationships, stats, etc.