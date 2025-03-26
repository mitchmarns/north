const characterService = require('../services/characterService');
const teamService = require('../services/teamService');
const relationshipService = require('../services/relationshipService');
const { validationResult } = require('express-validator');
const { 
  Character, 
  CharacterGallery, 
  User, 
  Relationship,
  RelationshipGallery,
  RelationshipPlaylist,
  Sequelize
} = require('../models');
// Get all characters (public)
exports.getAllCharacters = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;

    const result = await characterService.getAllCharacters(page, limit);

    res.render('characters/index', {
      title: 'Character Directory',
      characters: result.characters,
      pagination: result.pagination
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;

    const result = await characterService.getUserCharacters(req.user.id, page, limit);

    res.render('characters/my-characters', {
      title: 'My Characters',
      characters: result.characters,
      pagination: result.pagination
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
    // Get relationships data using the service
    const relationshipsData = await relationshipService.getCharacterRelationships(
      req.params.id, 
      req.user.id
    );
    
    res.render('characters/relationships', {
      title: `${relationshipsData.character.name}'s Relationships`,
      ...relationshipsData
    });
  } catch (error) {
    console.error('Error fetching relationships:', error);
    
    if (error.message === 'Character not found') {
      req.flash('error_msg', 'Character not found');
    } else if (error.message === 'Not authorized') {
      req.flash('error_msg', 'Not authorized');
    } else {
      req.flash('error_msg', 'An error occurred while fetching relationships');
    }
    
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
    
    // Validate the character2Id is present
    if (!character2Id) {
      req.flash('error_msg', 'Please select a character for the relationship');
      return res.redirect(`/characters/${req.params.id}/relationships`);
    }
    
    // Add relationship using the service
    await relationshipService.addRelationship(character1Id, character2Id, {
      relationshipType,
      description,
      status
    }, req.user.id);
    
    // Check if it's a self-relationship (same user owns both characters)
    const character1 = await Character.findByPk(character1Id);
    const character2 = await Character.findByPk(character2Id);
    
    if (character1.userId === character2.userId) {
      req.flash('success_msg', 'Relationship added successfully');
    } else {
      req.flash('success_msg', 'Relationship request sent. Waiting for the other player to approve.');
    }
    
    res.redirect(`/characters/${req.params.id}/relationships`);
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
    // Get pending requests using the service
    const requests = await relationshipService.getPendingRequests(req.user.id);
    
    res.render('characters/relationship-requests', {
      title: 'Pending Relationship Requests',
      requests
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
    
    // Update relationship using the service
    await relationshipService.updateRelationship(
      req.params.relationshipId, 
      { relationshipType, description, status }, 
      req.user.id
    );
    
    req.flash('success_msg', 'Relationship updated successfully');
    res.redirect(req.headers.referer || '/characters');
  } catch (error) {
    console.error('Error updating relationship:', error);
    
    if (error.message.includes('not found') || error.message.includes('not authorized')) {
      req.flash('error_msg', error.message);
    } else {
      req.flash('error_msg', 'An error occurred while updating relationship');
    }
    
    res.redirect(req.headers.referer || '/characters');
  }
};

// Delete relationship
exports.deleteRelationship = async (req, res) => {
  try {
    // Delete relationship using the service
    await relationshipService.deleteRelationship(req.params.relationshipId, req.user.id);
    
    req.flash('success_msg', 'Relationship deleted successfully');
    res.redirect(req.headers.referer || '/characters');
  } catch (error) {
    console.error('Error deleting relationship:', error);
    
    if (error.message.includes('not found') || error.message.includes('not authorized')) {
      req.flash('error_msg', error.message);
    } else {
      req.flash('error_msg', 'An error occurred while deleting relationship');
    }
    
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

// Upload gallery image
exports.uploadGalleryImage = async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    req.flash('error_msg', errors.array()[0].msg);
    return res.redirect(`/characters/${req.params.id}/gallery/upload`);
  }
  
  try {
    const { imageUrl, caption } = req.body;
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
    
    // Get highest display order
    const highestOrder = await CharacterGallery.max('displayOrder', {
      where: { characterId }
    }) || 0;
    
    // Create new gallery image
    await CharacterGallery.create({
      characterId,
      imageUrl,
      caption: caption || null,
      displayOrder: highestOrder + 1
    });
    
    req.flash('success_msg', 'Image added to gallery');
    res.redirect(`/characters/${characterId}/gallery`);
  } catch (error) {
    console.error('Error uploading gallery image:', error);
    req.flash('error_msg', 'An error occurred while uploading the image');
    res.redirect(`/characters/${req.params.id}/gallery/upload`);
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
      return res.status(404).json({ success: false, message: 'Relationship not found' });
    }
    
    // Check if user owns one of the characters
    const isCharacter1Owner = relationship.character1.userId === req.user.id;
    const isCharacter2Owner = relationship.character2.userId === req.user.id;
    
    if (!isCharacter1Owner && !isCharacter2Owner) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    
    // Update order for each image
    for (let i = 0; i < imageIds.length; i++) {
      await RelationshipGallery.update(
        { displayOrder: i },
        { where: { id: imageIds[i], relationshipId } }
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

// Get relationship details
exports.getRelationshipDetails = async (req, res) => {
  try {
    // Get relationship details using the service
    const relationshipData = await relationshipService.getRelationshipDetails(
      req.params.relationshipId,
      req.user.id
    );
    
    res.render('characters/relationship-detail', {
      title: `${relationshipData.relationship.character1.name} & ${relationshipData.relationship.character2.name}`,
      ...relationshipData
    });
  } catch (error) {
    console.error('Error fetching relationship details:', error);
    
    if (error.message === 'Relationship not found') {
      req.flash('error_msg', 'Relationship not found');
    } else if (error.message === 'Not authorized to view this relationship') {
      req.flash('error_msg', 'Not authorized to view this relationship');
    } else {
      req.flash('error_msg', 'An error occurred while fetching relationship details');
    }
    
    res.redirect('/characters/my-characters');
  }
};

// Get relationship gallery
exports.getRelationshipGallery = async (req, res) => {
  try {
    const relationshipId = req.params.relationshipId;
    
    // Find relationship with characters and users
    const relationship = await Relationship.findByPk(relationshipId, {
      include: [
        {
          model: Character,
          as: 'character1',
          include: [{ model: User, attributes: ['username', 'id'] }]
        },
        {
          model: Character,
          as: 'character2',
          include: [{ model: User, attributes: ['username', 'id'] }]
        }
      ]
    });
    
    if (!relationship) {
      req.flash('error_msg', 'Relationship not found');
      return res.redirect('/characters/my-characters');
    }
    
    // Check if user owns one of the characters in the relationship
    const isCharacter1Owner = relationship.character1.userId === req.user.id;
    const isCharacter2Owner = relationship.character2.userId === req.user.id;
    
    if (!isCharacter1Owner && !isCharacter2Owner) {
      req.flash('error_msg', 'Not authorized to view this relationship gallery');
      return res.redirect('/characters/my-characters');
    }
    
    // Get gallery images
    const galleryImages = await RelationshipGallery.findAll({
      where: { relationshipId },
      include: [
        {
          model: User,
          as: 'uploader',
          attributes: ['username']
        }
      ],
      order: [['displayOrder', 'ASC'], ['createdAt', 'DESC']]
    });
    
    res.render('characters/relationship-gallery', {
      title: `Gallery: ${relationship.character1.name} & ${relationship.character2.name}`,
      relationship,
      galleryImages,
      isCharacter1Owner,
      isCharacter2Owner
    });
  } catch (error) {
    console.error('Error fetching relationship gallery:', error);
    req.flash('error_msg', 'An error occurred while fetching the gallery');
    res.redirect('/characters/my-characters');
  }
};

// Get relationship playlist
exports.getRelationshipPlaylist = async (req, res) => {
  try {
    const relationshipId = req.params.relationshipId;
    
    // Find relationship with characters and users
    const relationship = await Relationship.findByPk(relationshipId, {
      include: [
        {
          model: Character,
          as: 'character1',
          include: [{ model: User, attributes: ['username', 'id'] }]
        },
        {
          model: Character,
          as: 'character2',
          include: [{ model: User, attributes: ['username', 'id'] }]
        }
      ]
    });
    
    if (!relationship) {
      req.flash('error_msg', 'Relationship not found');
      return res.redirect('/characters/my-characters');
    }
    
    // Check if user owns one of the characters in the relationship
    const isCharacter1Owner = relationship.character1.userId === req.user.id;
    const isCharacter2Owner = relationship.character2.userId === req.user.id;
    
    if (!isCharacter1Owner && !isCharacter2Owner) {
      req.flash('error_msg', 'Not authorized to view this relationship playlist');
      return res.redirect('/characters/my-characters');
    }
    
    // Get playlist songs
    const playlistSongs = await RelationshipPlaylist.findAll({
      where: { relationshipId },
      include: [
        {
          model: User,
          as: 'uploader',
          attributes: ['username']
        }
      ],
      order: [['displayOrder', 'ASC'], ['createdAt', 'DESC']]
    });
    
    res.render('characters/relationship-playlist', {
      title: `Playlist: ${relationship.character1.name} & ${relationship.character2.name}`,
      relationship,
      playlistSongs,
      isCharacter1Owner,
      isCharacter2Owner
    });
  } catch (error) {
    console.error('Error fetching relationship playlist:', error);
    req.flash('error_msg', 'An error occurred while fetching the playlist');
    res.redirect('/characters/my-characters');
  }
};

// Add song to playlist
exports.addPlaylistSong = async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    req.flash('error_msg', errors.array()[0].msg);
    return res.redirect(`/characters/relationships/${req.params.relationshipId}/playlist`);
  }
  
  try {
    const { songTitle, artistName, albumName, albumCoverUrl, songUrl, description } = req.body;
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
      return res.redirect('/characters/my-characters');
    }
    
    // Check if user owns one of the characters
    const isCharacter1Owner = relationship.character1.userId === req.user.id;
    const isCharacter2Owner = relationship.character2.userId === req.user.id;
    
    if (!isCharacter1Owner && !isCharacter2Owner) {
      req.flash('error_msg', 'Not authorized to add songs to this relationship');
      return res.redirect('/characters/my-characters');
    }
    
    // Get highest display order
    const highestOrder = await RelationshipPlaylist.max('displayOrder', {
      where: { relationshipId }
    }) || 0;
    
    // Create new playlist song
    await RelationshipPlaylist.create({
      relationshipId,
      songTitle,
      artistName,
      albumName: albumName || null,
      albumCoverUrl: albumCoverUrl || null,
      songUrl: songUrl || null,
      description: description || null,
      uploadedBy: req.user.id,
      displayOrder: highestOrder + 1
    });
    
    req.flash('success_msg', 'Song added to playlist');
    res.redirect(`/characters/relationships/${relationshipId}/playlist`);
  } catch (error) {
    console.error('Error adding playlist song:', error);
    req.flash('error_msg', 'An error occurred while adding the song');
    res.redirect(`/characters/relationships/${req.params.relationshipId}/playlist`);
  }
};

// Delete playlist song
exports.deletePlaylistSong = async (req, res) => {
  try {
    const songId = req.params.songId;
    const relationshipId = req.params.relationshipId;
    
    // Find song
    const song = await RelationshipPlaylist.findByPk(songId, {
      include: [
        {
          model: Relationship,
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
        }
      ]
    });
    
    if (!song) {
      req.flash('error_msg', 'Song not found');
      return res.redirect(`/characters/relationships/${relationshipId}/playlist`);
    }
    
    // Check if user owns one of the characters in the relationship
    const relationship = song.Relationship;
    const isCharacter1Owner = relationship.character1.userId === req.user.id;
    const isCharacter2Owner = relationship.character2.userId === req.user.id;
    
    if (!isCharacter1Owner && !isCharacter2Owner) {
      req.flash('error_msg', 'Not authorized to delete songs from this relationship');
      return res.redirect(`/characters/relationships/${relationshipId}/playlist`);
    }
    
    // Delete song
    await song.destroy();
    
    req.flash('success_msg', 'Song removed from playlist');
    res.redirect(`/characters/relationships/${relationshipId}/playlist`);
  } catch (error) {
    console.error('Error deleting playlist song:', error);
    req.flash('error_msg', 'An error occurred while deleting the song');
    res.redirect(`/characters/relationships/${req.params.relationshipId}/playlist`);
  }
};

// Add gallery image form
exports.getAddGalleryImage = async (req, res) => {
  try {
    const relationshipId = req.params.relationshipId;
    
    // Find relationship
    const relationship = await Relationship.findByPk(relationshipId, {
      include: [
        {
          model: Character,
          as: 'character1',
          include: [{ model: User, attributes: ['username', 'id'] }]
        },
        {
          model: Character,
          as: 'character2',
          include: [{ model: User, attributes: ['username', 'id'] }]
        }
      ]
    });
    
    if (!relationship) {
      req.flash('error_msg', 'Relationship not found');
      return res.redirect('/characters/my-characters');
    }
    
    // Check if user owns one of the characters
    const isCharacter1Owner = relationship.character1.userId === req.user.id;
    const isCharacter2Owner = relationship.character2.userId === req.user.id;
    
    if (!isCharacter1Owner && !isCharacter2Owner) {
      req.flash('error_msg', 'Not authorized to add images to this relationship');
      return res.redirect('/characters/my-characters');
    }
    
    res.render('characters/add-relationship-image', {
      title: `Add Image: ${relationship.character1.name} & ${relationship.character2.name}`,
      relationship,
      isCharacter1Owner,
      isCharacter2Owner
    });
  } catch (error) {
    console.error('Error loading add image form:', error);
    req.flash('error_msg', 'An error occurred while loading the form');
    res.redirect('/characters/relationships/view/' + req.params.relationshipId);
  }
};

// Add gallery image
exports.addGalleryImage = async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    req.flash('error_msg', errors.array()[0].msg);
    return res.redirect(`/characters/relationships/${req.params.relationshipId}/gallery/add`);
  }
  
  try {
    const { imageUrl, caption } = req.body;
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
      return res.redirect('/characters/my-characters');
    }
    
    // Check if user owns one of the characters
    const isCharacter1Owner = relationship.character1.userId === req.user.id;
    const isCharacter2Owner = relationship.character2.userId === req.user.id;
    
    if (!isCharacter1Owner && !isCharacter2Owner) {
      req.flash('error_msg', 'Not authorized to add images to this relationship');
      return res.redirect('/characters/my-characters');
    }
    
    // Get highest display order
    const highestOrder = await RelationshipGallery.max('displayOrder', {
      where: { relationshipId }
    }) || 0;
    
    // Create new gallery image
    await RelationshipGallery.create({
      relationshipId,
      imageUrl,
      caption: caption || null,
      uploadedBy: req.user.id,
      displayOrder: highestOrder + 1
    });
    
    req.flash('success_msg', 'Image added to gallery');
    res.redirect(`/characters/relationships/${relationshipId}/gallery`);
  } catch (error) {
    console.error('Error adding gallery image:', error);
    req.flash('error_msg', 'An error occurred while adding the image');
    res.redirect(`/characters/relationships/${req.params.relationshipId}/gallery/add`);
  }
};

// Delete gallery image
exports.deleteGalleryImage = async (req, res) => {
  try {
    const imageId = req.params.imageId;
    const relationshipId = req.params.relationshipId;
    
    // Find image
    const image = await RelationshipGallery.findByPk(imageId, {
      include: [
        {
          model: Relationship,
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
        }
      ]
    });
    
    if (!image) {
      req.flash('error_msg', 'Image not found');
      return res.redirect(`/characters/relationships/${relationshipId}/gallery`);
    }
    
    // Check if user owns one of the characters in the relationship
    const relationship = image.Relationship;
    const isCharacter1Owner = relationship.character1.userId === req.user.id;
    const isCharacter2Owner = relationship.character2.userId === req.user.id;
    
    if (!isCharacter1Owner && !isCharacter2Owner) {
      req.flash('error_msg', 'Not authorized to delete images from this relationship');
      return res.redirect(`/characters/relationships/${relationshipId}/gallery`);
    }
    
    // Delete image
    await image.destroy();
    
    req.flash('success_msg', 'Image deleted from gallery');
    res.redirect(`/characters/relationships/${relationshipId}/gallery`);
  } catch (error) {
    console.error('Error deleting gallery image:', error);
    req.flash('error_msg', 'An error occurred while deleting the image');
    res.redirect(`/characters/relationships/${req.params.relationshipId}/gallery`);
  }
};

// Update gallery image order
// Update gallery image order
exports.updateGalleryOrder = async (req, res) => {
  try {
    const { imageIds } = req.body;
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
      return res.status(404).json({ success: false, message: 'Relationship not found' });
    }
    
    // Check if user owns one of the characters
    const isCharacter1Owner = relationship.character1.userId === req.user.id;
    const isCharacter2Owner = relationship.character2.userId === req.user.id;
    
    if (!isCharacter1Owner && !isCharacter2Owner) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    
    // Update order for each image
    for (let i = 0; i < imageIds.length; i++) {
      await RelationshipGallery.update(
        { displayOrder: i },
        { where: { id: imageIds[i], relationshipId } }
      );
    }
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error updating gallery order:', error);
    return res.status(500).json({ success: false, message: 'An error occurred' });
  }
};
  