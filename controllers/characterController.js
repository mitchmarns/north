const { Character, User, Relationship, sequelize, Sequelize } = require('../models');
const { validationResult } = require('express-validator');

// Get all characters (public)
exports.getAllCharacters = async (req, res) => {
  try {
    const characters = await Character.findAll({
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

    res.render('characters/index', {
      title: 'Character Directory',
      characters
    });
  } catch (error) {
    console.error('Error fetching characters:', error);
    req.flash('error_msg', 'An error occurred while fetching characters');
    res.redirect('/');
  }
};

// Get user's characters
exports.getUserCharacters = async (req, res) => {
  try {
    const characters = await Character.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });

    res.render('characters/my-characters', {
      title: 'My Characters',
      characters
    });
  } catch (error) {
    console.error('Error fetching user characters:', error);
    req.flash('error_msg', 'An error occurred while fetching your characters');
    res.redirect('/dashboard');
  }
};

// Get single character
exports.getCharacter = async (req, res) => {
  try {
    // Log the character ID we're trying to fetch
    console.log(`Fetching character with ID: ${req.params.id}`);
    
    const character = await Character.findByPk(req.params.id, {
      include: [
        {
          model: User,
          attributes: ['username', 'id']
        }
      ]
    });

    if (!character) {
      req.flash('error_msg', 'Character not found');
      return res.redirect('/characters');
    }

    // Check if character is private and not owned by user
    if (character.isPrivate && (!req.user || req.user.id !== character.userId)) {
      req.flash('error_msg', 'This character is private');
      return res.redirect('/characters');
    }

    // Try/catch for just the relationships query
    try {
      // Get character relationships
      const relationships = await Relationship.findAll({
        where: {
          [Sequelize.Op.or]: [
            { character1Id: character.id },
            { character2Id: character.id }
          ]
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

      res.render('characters/view', {
        title: character.name,
        character,
        relationships: formattedRelationships,
        isOwner: req.user && req.user.id === character.userId
      });
    } catch (relationshipError) {
      console.error('Error fetching relationships:', relationshipError);
      // Fall back to showing the character without relationships
      res.render('characters/view', {
        title: character.name,
        character,
        relationships: [],
        isOwner: req.user && req.user.id === character.userId
      });
    }
  } catch (error) {
    console.error('Error fetching character:', error);
    req.flash('error_msg', 'An error occurred while fetching the character');
    res.redirect('/characters');
  }
};

// Get character for editing
exports.getEditCharacter = async (req, res) => {
  try {
    const character = await Character.findByPk(req.params.id);

    if (!character) {
      req.flash('error_msg', 'Character not found');
      return res.redirect('/characters/my-characters');
    }

    // Check if user owns the character
    if (character.userId !== req.user.id) {
      req.flash('error_msg', 'Not authorized');
      return res.redirect('/characters/my-characters');
    }

    res.render('characters/edit', {
      title: `Edit ${character.name}`,
      character
    });
  } catch (error) {
    console.error('Error fetching character for edit:', error);
    req.flash('error_msg', 'An error occurred while fetching the character');
    res.redirect('/characters/my-characters');
  }
};

// Create a new character
exports.createCharacter = async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.render('characters/create', {
      title: 'Create a New Character',
      errors: errors.array(),
      character: req.body
    });
  }

  try {
    const {
      name, nickname, age, gender, shortBio, fullBio,
      appearance, personality, background, skills,
      likes, dislikes, fears, goals, faceclaim, avatarUrl, isPrivate
    } = req.body;

    // Create character
    const character = await Character.create({
      userId: req.user.id,
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
      isPrivate: isPrivate === 'on'
    });

    req.flash('success_msg', `${character.name} has been created successfully`);
    res.redirect(`/characters/${character.id}`);
  } catch (error) {
    console.error('Error creating character:', error);
    req.flash('error_msg', 'An error occurred while creating the character');
    res.redirect('/characters/create');
  }
};

// Update character
exports.updateCharacter = async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.render('characters/edit', {
      title: 'Edit Character',
      errors: errors.array(),
      character: {
        ...req.body,
        id: req.params.id
      }
    });
  }

  try {
    // Find character
    const character = await Character.findByPk(req.params.id);
    
    if (!character) {
      req.flash('error_msg', 'Character not found');
      return res.redirect('/characters/my-characters');
    }
    
    // Check if user owns the character
    if (character.userId !== req.user.id) {
      req.flash('error_msg', 'Not authorized');
      return res.redirect('/characters/my-characters');
    }
    
    const {
      name, nickname, age, gender, shortBio, fullBio,
      appearance, personality, background, skills,
      likes, dislikes, fears, goals, faceclaim, avatarUrl, isPrivate, isArchived
    } = req.body;

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
      isPrivate: isPrivate === 'on',
      isArchived: isArchived === 'on'
    });

    req.flash('success_msg', `${character.name} has been updated successfully`);
    res.redirect(`/characters/${character.id}`);
  } catch (error) {
    console.error('Error updating character:', error);
    req.flash('error_msg', 'An error occurred while updating the character');
    res.redirect(`/characters/edit/${req.params.id}`);
  }
};

// Delete character
exports.deleteCharacter = async (req, res) => {
  try {
    // Find character
    const character = await Character.findByPk(req.params.id);
    
    if (!character) {
      req.flash('error_msg', 'Character not found');
      return res.redirect('/characters/my-characters');
    }
    
    // Check if user owns the character
    if (character.userId !== req.user.id) {
      req.flash('error_msg', 'Not authorized');
      return res.redirect('/characters/my-characters');
    }
    
    // Delete character
    await character.destroy();

    req.flash('success_msg', 'Character has been deleted successfully');
    res.redirect('/characters/my-characters');
  } catch (error) {
    console.error('Error deleting character:', error);
    req.flash('error_msg', 'An error occurred while deleting the character');
    res.redirect('/characters/my-characters');
  }
};

// Get character relationships
exports.getCharacterRelationships = async (req, res) => {
  try {
    console.log('==========================================');
    console.log('DEBUG: Getting relationships for character ID:', req.params.id);
    
    // Get the character
    const character = await Character.findByPk(req.params.id);
    
    if (!character) {
      console.log('DEBUG: Character not found');
      req.flash('error_msg', 'Character not found');
      return res.redirect('/characters');
    }
    
    console.log('DEBUG: Found character:', character.name);
    console.log('DEBUG: Character owner ID:', character.userId);
    console.log('DEBUG: Current user ID:', req.user.id);
    
    // Check if user owns the character
    if (character.userId !== req.user.id) {
      console.log('DEBUG: User not authorized');
      req.flash('error_msg', 'Not authorized');
      return res.redirect('/characters');
    }
    
    console.log('DEBUG: User authorized, fetching relationships...');
    
    // Try fetching relationships with error handling for each step
    try {
      // Get relationships - simplify the query to isolate the issue
      const relationships = await Relationship.findAll({
        where: {
          [Sequelize.Op.or]: [
            { character1Id: character.id },
            { character2Id: character.id }
          ]
        }
      });
      
      console.log('DEBUG: Raw relationships found:', relationships.length);
      
      // Now try to include the character data
      const fullRelationships = await Relationship.findAll({
        where: {
          [Sequelize.Op.or]: [
            { character1Id: character.id },
            { character2Id: character.id }
          ]
        },
        include: [
          { model: Character, as: 'character1' },
          { model: Character, as: 'character2' }
        ]
      });
      
      console.log('DEBUG: Full relationships with character data:', 
                 fullRelationships ? fullRelationships.length : 'null');
      
      // Continue with the rest of your existing code...
      // ...
    } catch (relError) {
      console.error('DEBUG: Specific error in relationship query:', relError);
      throw relError; // Rethrow to be caught by the outer catch block
    }
    
    // Rest of your existing code...
    
  } catch (error) {
    console.error('ERROR in getCharacterRelationships:', error);
    console.error(error.stack);
    req.flash('error_msg', 'An error occurred while fetching relationships');
    res.redirect(`/characters/${req.params.id}`);
  }
};

// Add relationship
exports.addRelationship = async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    req.flash('error_msg', errors.array()[0].msg);
    return res.redirect(`/characters/${req.params.id}/relationships`);
  }

  try {
    const { character2Id, relationshipType, description, status } = req.body;
    const character1Id = parseInt(req.params.id);
    
    // Verify characters exist
    const character1 = await Character.findByPk(character1Id);
    const character2 = await Character.findByPk(character2Id);
    
    if (!character1 || !character2) {
      req.flash('error_msg', 'One or both characters not found');
      return res.redirect(`/characters/${req.params.id}/relationships`);
    }
    
    // Check if user owns the first character
    if (character1.userId !== req.user.id) {
      req.flash('error_msg', 'Not authorized to create relationships for this character');
      return res.redirect(`/characters/${req.params.id}/relationships`);
    }
    
    // Check if relationship already exists
    const existingRelationship = await Relationship.findOne({
      where: {
        [Sequelize.Op.or]: [
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
      req.flash('error_msg', 'Relationship already exists');
      return res.redirect(`/characters/${req.params.id}/relationships`);
    }
    
    // Determine if this is a self-relationship or cross-user relationship
    const isSelfRelationship = character1.userId === character2.userId;
    
    // Create relationship with appropriate status
    await Relationship.create({
      character1Id,
      character2Id,
      relationshipType,
      description: description || null,
      status: status || 'Neutral',
      isPending: !isSelfRelationship,  // Only pending if it involves another user's character
      isApproved: isSelfRelationship,  // Auto-approved if both characters belong to the same user
      requestedById: req.user.id
    });
    
    if (isSelfRelationship) {
      req.flash('success_msg', 'Relationship added successfully');
    } else {
      req.flash('success_msg', 'Relationship request sent. Waiting for the other player to approve.');
    }
    
    res.redirect(`/characters/${req.params.id}/relationships`);
  } catch (error) {
    console.error('Error adding relationship:', error);
    req.flash('error_msg', 'An error occurred while adding relationship');
    res.redirect(`/characters/${req.params.id}/relationships`);
  }
};

// Approve relationship request
exports.approveRelationship = async (req, res) => {
  try {
    const relationshipId = req.params.relationshipId;
    
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
      req.flash('error_msg', 'Relationship not found');
      return res.redirect(req.headers.referer || '/characters');
    }
    
    // Determine which character belongs to the current user
    const userCharacter = relationship.character1.userId === req.user.id ? relationship.character1 
                         : relationship.character2.userId === req.user.id ? relationship.character2 
                         : null;
    
    if (!userCharacter) {
      req.flash('error_msg', 'Not authorized to approve this relationship');
      return res.redirect(req.headers.referer || '/characters');
    }
    
    // Check if the relationship is pending and not already approved
    if (!relationship.isPending || relationship.isApproved) {
      req.flash('error_msg', 'This relationship is not pending approval');
      return res.redirect(req.headers.referer || '/characters');
    }
    
    // Update relationship to approved status
    await relationship.update({
      isPending: false,
      isApproved: true
    });
    
    req.flash('success_msg', 'Relationship approved successfully');
    res.redirect(req.headers.referer || `/characters/${userCharacter.id}/relationships`);
  } catch (error) {
    console.error('Error approving relationship:', error);
    req.flash('error_msg', 'An error occurred while approving the relationship');
    res.redirect(req.headers.referer || '/characters');
  }
};

// Decline relationship request
exports.declineRelationship = async (req, res) => {
  try {
    const relationshipId = req.params.relationshipId;
    
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
      req.flash('error_msg', 'Relationship not found');
      return res.redirect(req.headers.referer || '/characters');
    }
    
    // Determine which character belongs to the current user
    const userCharacter = relationship.character1.userId === req.user.id ? relationship.character1 
                         : relationship.character2.userId === req.user.id ? relationship.character2 
                         : null;
    
    if (!userCharacter) {
      req.flash('error_msg', 'Not authorized to decline this relationship');
      return res.redirect(req.headers.referer || '/characters');
    }
    
    // Check if the relationship is pending
    if (!relationship.isPending) {
      req.flash('error_msg', 'This relationship is not pending approval');
      return res.redirect(req.headers.referer || '/characters');
    }
    
    // Delete the declined relationship request
    await relationship.destroy();
    
    req.flash('success_msg', 'Relationship request declined');
    res.redirect(req.headers.referer || `/characters/${userCharacter.id}/relationships`);
  } catch (error) {
    console.error('Error declining relationship:', error);
    req.flash('error_msg', 'An error occurred while declining the relationship');
    res.redirect(req.headers.referer || '/characters');
  }
};

// The function for handling pending relationship requests
exports.getRelationshipRequests = async (req, res) => {
  try {
    // Get all characters owned by the user
    const userCharacters = await Character.findAll({
      where: {
        userId: req.user.id
      }
    });
    
    // Get IDs of all user's characters
    const characterIds = userCharacters.map(char => char.id);
    
    // Find pending relationships involving user's characters
    const pendingRelationships = await Relationship.findAll({
      where: {
        [Sequelize.Op.or]: [
          {
            character1Id: { [Sequelize.Op.in]: characterIds },
            isPending: true,
            requestedById: { [Sequelize.Op.ne]: req.user.id }
          },
          {
            character2Id: { [Sequelize.Op.in]: characterIds },
            isPending: true,
            requestedById: { [Sequelize.Op.ne]: req.user.id }
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
    
    res.render('characters/relationship-requests', {
      title: 'Pending Relationship Requests',
      requests: formattedRequests
    });
  } catch (error) {
    console.error('Error fetching relationship requests:', error);
    req.flash('error_msg', 'An error occurred while fetching relationship requests');
    res.redirect('/dashboard');
  }
};

// Update relationship
exports.updateRelationship = async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    req.flash('error_msg', errors.array()[0].msg);
    return res.redirect(req.headers.referer || '/characters');
  }

  try {
    const { relationshipType, description, status } = req.body;
    const relationshipId = req.params.relationshipId;
    
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
      req.flash('error_msg', 'Relationship not found');
      return res.redirect(req.headers.referer || '/characters');
    }
    
    // Check if user owns at least one of the characters
    if (relationship.character1.userId !== req.user.id && relationship.character2.userId !== req.user.id) {
      req.flash('error_msg', 'Not authorized');
      return res.redirect(req.headers.referer || '/characters');
    }
    
    // Update relationship
    await relationship.update({
      relationshipType,
      description: description || null,
      status: status || 'Neutral'
    });
    
    req.flash('success_msg', 'Relationship updated successfully');
    res.redirect(req.headers.referer || `/characters/${relationship.character1Id}/relationships`);
  } catch (error) {
    console.error('Error updating relationship:', error);
    req.flash('error_msg', 'An error occurred while updating relationship');
    res.redirect(req.headers.referer || '/characters');
  }
};

// Delete relationship
exports.deleteRelationship = async (req, res) => {
  try {
    const relationshipId = req.params.relationshipId;
    
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
      req.flash('error_msg', 'Relationship not found');
      return res.redirect(req.headers.referer || '/characters');
    }
    
    // Check if user owns at least one of the characters
    if (relationship.character1.userId !== req.user.id && relationship.character2.userId !== req.user.id) {
      req.flash('error_msg', 'Not authorized');
      return res.redirect(req.headers.referer || '/characters');
    }
    
    // Delete relationship
    await relationship.destroy();
    
    req.flash('success_msg', 'Relationship deleted successfully');
    res.redirect(req.headers.referer || `/characters/${relationship.character1Id}/relationships`);
  } catch (error) {
    console.error('Error deleting relationship:', error);
    req.flash('error_msg', 'An error occurred while deleting relationship');
    res.redirect(req.headers.referer || '/characters');
  }
};