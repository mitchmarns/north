const characterService = require('../services/characterService');
const teamService = require('../services/teamService');
const { validationResult } = require('express-validator');

// Get all characters (public)
exports.getAllCharacters = async (req, res) => {
  try {
    const characters = await characterService.getAllCharacters();

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
    const characters = await characterService.getUserCharacters(req.user.id);

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
    // Get character data with relationships
    const characterData = await characterService.getCharacterWithRelationships(req.params.id, req.user?.id);
    
    // Get messaging data if user is logged in
    const messagingData = req.user 
      ? await characterService.getMessagingData(req.user.id, parseInt(req.params.id))
      : { userCharacters: [], canMessage: false };

    // Combine data for rendering
    res.render('characters/view', {
      title: characterData.character.name,
      ...characterData,
      ...messagingData
    });
  } catch (error) {
    console.error('Error fetching character:', error);
    
    // Handle specific errors
    if (error.message === 'Character not found') {
      req.flash('error_msg', 'Character not found');
    } else if (error.message === 'This character is private') {
      req.flash('error_msg', 'This character is private');
    } else {
      req.flash('error_msg', 'An error occurred while fetching the character');
    }
    
    res.redirect('/characters');
  }
};

// Get character for editing
exports.getEditCharacter = async (req, res) => {
  try {
    // Import Team model directly to ensure it's available
    const { Character, Team } = require('../models');
    
    // Get the character
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
    
    // Get teams for the dropdown
    let teams = [];
    try {
      teams = await Team.findAll({
        where: {
          isActive: true
        },
        order: [['name', 'ASC']]
      });
      console.log(`Found ${teams.length} teams for dropdown`);
    } catch (teamError) {
      console.error('Error fetching teams:', teamError);
      // Continue without teams data
    }

    res.render('characters/edit', {
      title: `Edit ${character.name}`,
      character,
      teams: teams || []
    });

    // Add default values for stats
    character.strength = character.strength || 0;
    character.dexterity = character.dexterity || 0;
    character.constitution = character.constitution || 0;
    character.intelligence = character.intelligence || 0;
    character.wisdom = character.wisdom || 0;
    character.charisma = character.charisma || 0;
    
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
    const character = await characterService.createCharacter(req.body, req.user.id);

    req.flash('success_msg', `${character.name} has been created successfully`);
    res.redirect(`/characters/${character.id}`);
  } catch (error) {
    console.error('Error creating character:', error);
    req.flash('error_msg', 'An error occurred while creating the character');
    res.redirect('/characters/create');
  }
};

// Get character creation form
exports.getCreateCharacterForm = async (req, res) => {
  try {
    // Get teams for the dropdown
    const teams = await teamService.getActiveTeams();

    res.render('characters/create', {
      title: 'Create a New Character',
      teams: teams || [],
      character: { role: 'Civilian' } // Default values
    });
  } catch (error) {
    console.error('Error loading create character form:', error);
    req.flash('error_msg', 'An error occurred while loading the form');
    res.redirect('/characters/my-characters');
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
    const character = await characterService.updateCharacter(req.params.id, req.body, req.user.id);

    req.flash('success_msg', `${character.name} has been updated successfully`);
    res.redirect(`/characters/${character.id}`);
  } catch (error) {
    console.error('Error updating character:', error);
    
    if (error.message === 'Character not found') {
      req.flash('error_msg', 'Character not found');
      return res.redirect('/characters/my-characters');
    } else if (error.message === 'Not authorized') {
      req.flash('error_msg', 'Not authorized');
      return res.redirect('/characters/my-characters');
    } else {
      req.flash('error_msg', 'An error occurred while updating the character');
      res.redirect(`/characters/edit/${req.params.id}`);
    }
  }
};

// Delete character
exports.deleteCharacter = async (req, res) => {
  try {
    await characterService.deleteCharacter(req.params.id, req.user.id);

    req.flash('success_msg', 'Character has been deleted successfully');
    res.redirect('/characters/my-characters');
  } catch (error) {
    console.error('Error deleting character:', error);
    
    if (error.message === 'Character not found') {
      req.flash('error_msg', 'Character not found');
    } else if (error.message === 'Not authorized') {
      req.flash('error_msg', 'Not authorized');
    } else {
      req.flash('error_msg', 'An error occurred while deleting the character');
    }
    
    res.redirect('/characters/my-characters');
  }
};

// Get character relationships
exports.getCharacterRelationships = async (req, res) => {
  try {
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
    
    // Get relationships
    const relationships = await Relationship.findAll({
      where: {
        [Sequelize.Op.or]: [
          { character1Id: characterId },
          { character2Id: characterId }
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
    
    console.log('DEBUG: Relationships found:', relationships ? relationships.length : 0);
    
    // Format relationships for display
    let formattedRelationships = [];
    if (relationships && relationships.length > 0) {
      formattedRelationships = relationships.map(rel => {
        const isCharacter1 = rel.character1Id === characterId;
        const otherCharacter = isCharacter1 ? rel.character2 : rel.character1;
        return {
          id: rel.id,
          otherCharacter: otherCharacter,
          relationshipType: rel.relationshipType,
          description: rel.description,
          status: rel.status || 'Neutral',
          isPending: rel.isPending || false,
          isApproved: rel.isApproved || false,
          canEdit: otherCharacter.userId === req.user.id || character.userId === req.user.id,
          otherUserName: otherCharacter.User ? otherCharacter.User.username : 'Unknown'
        };
      });
    }
    
    console.log('DEBUG: Formatted relationships:', formattedRelationships.length);
    
    // Get user's other characters for relationship creation
    const userCharacters = await Character.findAll({
      where: {
        userId: req.user.id,
        id: {
          [Sequelize.Op.ne]: characterId
        },
        isArchived: false
      }
    });
    
    console.log('DEBUG: User characters found:', userCharacters ? userCharacters.length : 0);
    
    // Get public characters from other users
    const otherUsersCharacters = await Character.findAll({
      where: {
        userId: {
          [Sequelize.Op.ne]: req.user.id
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
    
    console.log('DEBUG: Other users characters found:', otherUsersCharacters ? otherUsersCharacters.length : 0);
    console.log('DEBUG: Rendering template...');
    
    // Render the template with fallbacks for all arrays
    res.render('characters/relationships', {
      title: `${character.name}'s Relationships`,
      character,
      relationships: formattedRelationships || [],
      userCharacters: userCharacters || [],
      otherUsersCharacters: otherUsersCharacters || []
    });
    
    console.log('DEBUG: Template rendered successfully');
    
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
    
    // Debug log - this helps you see exactly what's being received
    console.log('Creating relationship with params:', { 
      character1Id, 
      character2Id, 
      relationshipType, 
      description, 
      status 
    });
    
    // Validate the character2Id is present
    if (!character2Id) {
      req.flash('error_msg', 'Please select a character for the relationship');
      return res.redirect(`/characters/${req.params.id}/relationships`);
    }
    
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
    
    // Debug log
    console.log('Creating relationship with isPending:', !isSelfRelationship);
    console.log('Is self relationship?', isSelfRelationship);
    console.log('Character1 userId:', character1.userId);
    console.log('Character2 userId:', character2.userId);
    
    // Create relationship with appropriate status
    const newRelationship = await Relationship.create({
      character1Id,
      character2Id,
      relationshipType,
      description: description || null,
      status: status || 'Neutral',
      isPending: !isSelfRelationship,  // Only pending if it involves another user's character
      isApproved: isSelfRelationship,  // Auto-approved if both characters belong to the same user
      requestedById: req.user.id
    });
    
    console.log('Relationship created:', newRelationship);
    
    if (isSelfRelationship) {
      req.flash('success_msg', 'Relationship added successfully');
    } else {
      req.flash('success_msg', 'Relationship request sent. Waiting for the other player to approve.');
    }
    
    res.redirect(`/characters/${req.params.id}/relationships`);

    // If it's a cross-user relationship that needs approval
    if (!isSelfRelationship) {
      const otherCharacter = await Character.findByPk(character2Id, {
        include: [{ model: User, attributes: ['username'] }]
      });
      
      // Send Discord notification
      discordNotifier.sendNotification(
        `New relationship request!`,
        {
          embeds: [{
            title: `Relationship Request: ${character1.name} → ${otherCharacter.name}`,
            description: `${character1.name} wants to be ${relationshipType} with ${otherCharacter.name}`,
            color: 0xffc107, // Warning color
            fields: [
              { name: 'Requester', value: `${req.user.username}`, inline: true },
              { name: 'Target', value: `${otherCharacter.User.username}`, inline: true },
              { name: 'Status', value: status || 'Neutral', inline: true }
            ],
            timestamp: new Date()
          }]
        }
      );
    }

  } catch (error) {
    console.error('Error adding relationship:', error);
    req.flash('error_msg', `An error occurred while adding relationship: ${error.message}`);
    res.redirect(`/characters/${req.params.id}/relationships`);
  }
};

// Approve relationship request
exports.approveRelationship = async (req, res) => {
  try {
    // Approve relationship using the service
    await relationshipService.approveRelationship(req.params.relationshipId, req.user.id);
    
    req.flash('success_msg', 'Relationship approved successfully');
    res.redirect(req.headers.referer || '/characters/relationship-requests');
  } catch (error) {
    console.error('Error approving relationship:', error);
    
    if (error.message.includes('not found') || error.message.includes('not authorized') || error.message.includes('not pending')) {
      req.flash('error_msg', error.message);
    } else {
      req.flash('error_msg', 'An error occurred while approving the relationship');
    }
    
    res.redirect(req.headers.referer || '/characters/relationship-requests');
  }
};

// Decline relationship request
exports.declineRelationship = async (req, res) => {
  try {
    // Decline relationship using the service
    await relationshipService.declineRelationship(req.params.relationshipId, req.user.id);
    
    req.flash('success_msg', 'Relationship request declined');
    res.redirect(req.headers.referer || '/characters/relationship-requests');
  } catch (error) {
    console.error('Error declining relationship:', error);
    
    if (error.message.includes('not found') || error.message.includes('not authorized') || error.message.includes('not pending')) {
      req.flash('error_msg', error.message);
    } else {
      req.flash('error_msg', 'An error occurred while declining the relationship');
    }
    
    res.redirect(req.headers.referer || '/characters/relationship-requests');
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

// Get character gallery
exports.getCharacterGallery = async (req, res) => {
  try {
    const galleryData = await characterService.getCharacterGallery(req.params.id, req.user?.id);
    
    res.render('characters/gallery', {
      title: `${galleryData.character.name}'s Gallery`,
      ...galleryData
    });
  } catch (error) {
    console.error('Error fetching character gallery:', error);
    
    if (error.message === 'Character not found') {
      req.flash('error_msg', 'Character not found');
    } else if (error.message === 'This character is private') {
      req.flash('error_msg', 'This character is private');
    } else {
      req.flash('error_msg', 'An error occurred while fetching the gallery');
    }
    
    res.redirect(`/characters/${req.params.id}`);
  }
};

// Upload gallery image form
exports.getUploadGalleryImage = async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    req.flash('error_msg', errors.array()[0].msg);
    return res.redirect(`/characters/${req.params.id}/gallery/upload`);
  }
  
  try {
    // Extract image data
    const imageData = {
      imageUrl: req.body.imageUrl,
      caption: req.body.caption
    };
    
    // Add gallery image using the service
    await characterService.addGalleryImage(req.params.id, imageData, req.user.id);
    
    req.flash('success_msg', 'Image added to gallery successfully');
    res.redirect(`/characters/${req.params.id}/gallery`);
  } catch (error) {
    console.error('Error uploading gallery image:', error);
    
    if (error.message === 'Character not found') {
      req.flash('error_msg', 'Character not found');
    } else if (error.message === 'Not authorized') {
      req.flash('error_msg', 'Not authorized');
    } else {
      req.flash('error_msg', 'An error occurred while uploading the image');
    }
    
    res.redirect(`/characters/${req.params.id}/gallery/upload`);
  }
};

// Upload gallery image
exports.getUploadGalleryImage = async (req, res) => {
  try {
    const characterId = req.params.id;
    
    // Find character
    const character = await Character.findByPk(characterId);
    
    if (!character) {
      req.flash('error_msg', 'Character not found');
      return res.redirect('/characters');
    }
    
    // Check if user owns the character
    if (character.userId !== req.user.id) {
      req.flash('error_msg', 'Not authorized');
      return res.redirect(`/characters/${characterId}`);
    }
    
    res.render('characters/upload-image', {
      title: `Add to ${character.name}'s Gallery`,
      character
    });
  } catch (error) {
    console.error('Error loading upload form:', error);
    req.flash('error_msg', 'An error occurred while loading the upload form');
    res.redirect(`/characters/${req.params.id}`);
  }
};

// Delete gallery image
exports.deleteGalleryImage = async (req, res) => {
  try {
    const imageId = req.params.imageId;
    
    // Find image
    const image = await CharacterGallery.findByPk(imageId, {
      include: [
        {
          model: Character,
          attributes: ['userId']
        }
      ]
    });
    
    if (!image) {
      req.flash('error_msg', 'Image not found');
      return res.redirect(`/characters/${req.params.id}/gallery`);
    }
    
    // Check if user owns the character
    if (image.Character && image.Character.userId !== req.user.id) {
      req.flash('error_msg', 'Not authorized');
      return res.redirect(`/characters/${req.params.id}/gallery`);
    }
    
    // Delete image
    await image.destroy();
    
    req.flash('success_msg', 'Image deleted from gallery');
    res.redirect(`/characters/${req.params.id}/gallery`);
  } catch (error) {
    console.error('Error deleting gallery image:', error);
    req.flash('error_msg', 'An error occurred while deleting the image');
    res.redirect(`/characters/${req.params.id}/gallery`);
  }
};

// Update gallery image order
exports.updateGalleryOrder = async (req, res) => {
  try {
    const { imageIds } = req.body;
    const characterId = req.params.id;
    
    // Find character
    const character = await Character.findByPk(characterId);
    
    if (!character) {
      return res.status(404).json({ success: false, message: 'Character not found' });
    }
    
    // Check if user owns the character
    if (character.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    
    // Update order for each image
    for (let i = 0; i < imageIds.length; i++) {
      await CharacterGallery.update(
        { displayOrder: i },
        { where: { id: imageIds[i], characterId } }
      );
    }
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error updating gallery order:', error);
    return res.status(500).json({ success: false, message: 'An error occurred' });
  }
};

// Get character playlist
exports.getCharacterPlaylist = async (req, res) => {
  try {
    const characterId = req.params.id;
    
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
      req.flash('error_msg', 'Character not found');
      return res.redirect('/characters');
    }
    
    // Check if character is private and user is not the owner
    if (character.isPrivate && (!req.user || req.user.id !== character.userId)) {
      req.flash('error_msg', 'This character is private');
      return res.redirect('/characters');
    }
    
    res.render('characters/playlist', {
      title: `${character.name}'s Playlist`,
      character,
      isOwner: req.user && req.user.id === character.userId
    });
  } catch (error) {
    console.error('Error fetching character playlist:', error);
    req.flash('error_msg', 'An error occurred while fetching the playlist');
    res.redirect(`/characters/${req.params.id}`);
  }
};

// Add song to playlist
exports.addSongToPlaylist = async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    req.flash('error_msg', errors.array()[0].msg);
    return res.redirect(`/characters/${req.params.id}/playlist`);
  }
  
  try {
    const { songTitle, artistName, albumName, albumCoverUrl, songUrl, description } = req.body;
    const characterId = req.params.id;
    
    // Find character
    const character = await Character.findByPk(characterId);
    
    if (!character) {
      req.flash('error_msg', 'Character not found');
      return res.redirect('/characters');
    }
    
    // Check if user owns the character
    if (character.userId !== req.user.id) {
      req.flash('error_msg', 'Not authorized');
      return res.redirect(`/characters/${characterId}`);
    }
    
    // Get current playlist
    const playlist = character.playlist || [];
    
    // Add new song
    playlist.push({
      id: Date.now(), // simple unique ID
      songTitle,
      artistName,
      albumName: albumName || null,
      albumCoverUrl: albumCoverUrl || null,
      songUrl: songUrl || null,
      description: description || null,
      addedAt: new Date()
    });
    
    // Update character
    await character.update({ playlist });
    
    req.flash('success_msg', 'Song added to playlist');
    res.redirect(`/characters/${characterId}/playlist`);
  } catch (error) {
    console.error('Error adding song to playlist:', error);
    req.flash('error_msg', 'An error occurred while adding the song');
    res.redirect(`/characters/${req.params.id}/playlist`);
  }
};

// Remove song from playlist
exports.removeSongFromPlaylist = async (req, res) => {
  try {
    const { songId } = req.params;
    const characterId = req.params.id;
    
    // Find character
    const character = await Character.findByPk(characterId);
    
    if (!character) {
      req.flash('error_msg', 'Character not found');
      return res.redirect('/characters');
    }
    
    // Check if user owns the character
    if (character.userId !== req.user.id) {
      req.flash('error_msg', 'Not authorized');
      return res.redirect(`/characters/${characterId}`);
    }
    
    // Get current playlist and remove song
    let playlist = character.playlist || [];
    playlist = playlist.filter(song => song.id != songId);
    
    // Update character
    await character.update({ playlist });
    
    req.flash('success_msg', 'Song removed from playlist');
    res.redirect(`/characters/${characterId}/playlist`);
  } catch (error) {
    console.error('Error removing song from playlist:', error);
    req.flash('error_msg', 'An error occurred while removing the song');
    res.redirect(`/characters/${req.params.id}/playlist`);
  }
};

// Get character stats edit form
exports.getEditStats = async (req, res) => {
  try {
    const characterId = req.params.id;
    
    // Find character
    const character = await Character.findByPk(characterId);
    
    if (!character) {
      req.flash('error_msg', 'Character not found');
      return res.redirect('/characters');
    }
    
    // Check if user owns the character
    if (character.userId !== req.user.id) {
      req.flash('error_msg', 'Not authorized');
      return res.redirect(`/characters/${characterId}`);
    }
    
    res.render('characters/edit-stats', {
      title: `Edit ${character.name}'s Stats`,
      character
    });
  } catch (error) {
    console.error('Error loading stats edit form:', error);
    req.flash('error_msg', 'An error occurred while loading the form');
    res.redirect(`/characters/${req.params.id}`);
  }
};

// Update character stats
exports.updateStats = async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    req.flash('error_msg', errors.array()[0].msg);
    return res.redirect(`/characters/${req.params.id}/stats/edit`);
  }
  
  try {
    // Extract stats data
    const statsData = {
      strength: req.body.strength,
      dexterity: req.body.dexterity,
      constitution: req.body.constitution,
      intelligence: req.body.intelligence,
      wisdom: req.body.wisdom,
      charisma: req.body.charisma,
      personalityType: req.body.personalityType,
      occupation: req.body.occupation
    };
    
    // Update stats using the service
    await characterService.updateCharacterStats(req.params.id, statsData, req.user.id);
    
    req.flash('success_msg', 'Character stats updated successfully');
    res.redirect(`/characters/${req.params.id}`);
  } catch (error) {
    console.error('Error updating character stats:', error);
    
    if (error.message === 'Character not found') {
      req.flash('error_msg', 'Character not found');
    } else if (error.message === 'Not authorized') {
      req.flash('error_msg', 'Not authorized');
    } else {
      req.flash('error_msg', 'An error occurred while updating character stats');
    }
    
    res.redirect(`/characters/${req.params.id}/stats/edit`);
  }
};