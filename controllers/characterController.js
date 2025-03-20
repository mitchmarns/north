const { Character, User, Relationship, sequelize } = require('../models');
const { validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');

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

    // Get character relationships
    const relationships = await Relationship.findAll({
      where: {
        [sequelize.Op.or]: [
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
      likes, dislikes, fears, goals, faceclaim, isPrivate
    } = req.body;

    // Handle avatar upload
    let avatarUrl = null;
    if (req.file) {
      avatarUrl = `/uploads/characters/${req.file.filename}`;
    }

    // Create character
    const character = await Character.create({
      userId: req.user.id,
      name,
      nickname: nickname || null,
      age: age || null,
      gender: gender || null,
      avatarUrl,
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
      likes, dislikes, fears, goals, faceclaim, isPrivate, isArchived
    } = req.body;

    // Handle avatar upload
    let avatarUrl = character.avatarUrl;
    if (req.file) {
      // Delete old avatar if exists
      if (character.avatarUrl) {
        const oldAvatarPath = path.join(__dirname, '../public', character.avatarUrl);
        if (fs.existsSync(oldAvatarPath)) {
          fs.unlinkSync(oldAvatarPath);
        }
      }
      avatarUrl = `/uploads/characters/${req.file.filename}`;
    }

    // Update character
    await character.update({
      name,
      nickname: nickname || null,
      age: age || null,
      gender: gender || null,
      avatarUrl,
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
    
    // Check if character has posts
    // This would require additional validation in a real app
    
    // Delete character's avatar if exists
    if (character.avatarUrl) {
      const avatarPath = path.join(__dirname, '../public', character.avatarUrl);
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
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
    const character = await Character.findByPk(req.params.id);
    
    if (!character) {
      req.flash('error_msg', 'Character not found');
      return res.redirect('/characters');
    }
    
    // Check if user owns the character
    if (character.userId !== req.user.id) {
      req.flash('error_msg', 'Not authorized');
      return res.redirect('/characters');
    }
    
    // Get relationships
    const relationships = await Relationship.findAll({
      where: {
        [sequelize.Op.or]: [
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
    
    // Get other characters for relationship creation
    const otherCharacters = await Character.findAll({
      where: {
        userId: req.user.id,
        id: {
          [sequelize.Op.ne]: character.id
        },
        isArchived: false
      }
    });
    
    res.render('characters/relationships', {
      title: `${character.name}'s Relationships`,
      character,
      relationships: formattedRelationships,
      otherCharacters
    });
  } catch (error) {
    console.error('Error fetching relationships:', error);
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
    
    // Verify characters exist and user owns them
    const character1 = await Character.findByPk(character1Id);
    const character2 = await Character.findByPk(character2Id);
    
    if (!character1 || !character2) {
      req.flash('error_msg', 'One or both characters not found');
      return res.redirect(`/characters/${req.params.id}/relationships`);
    }
    
    if (character1.userId !== req.user.id || character2.userId !== req.user.id) {
      req.flash('error_msg', 'Not authorized');
      return res.redirect(`/characters/${req.params.id}/relationships`);
    }
    
    // Check if relationship already exists
    const existingRelationship = await Relationship.findOne({
      where: {
        [sequelize.Op.or]: [
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
    
    // Create relationship
    await Relationship.create({
      character1Id,
      character2Id,
      relationshipType,
      description: description || null,
      status: status || 'Neutral'
    });
    
    req.flash('success_msg', 'Relationship added successfully');
    res.redirect(`/characters/${req.params.id}/relationships`);
  } catch (error) {
    console.error('Error adding relationship:', error);
    req.flash('error_msg', 'An error occurred while adding relationship');
    res.redirect(`/characters/${req.params.id}/relationships`);
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