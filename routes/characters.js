const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const characterController = require('../controllers/characterController');
const { isAuthenticated } = require('../middleware/auth');

// List all characters - This should load all registered characters, not just the user's own
router.get('/', characterController.getAllCharacters);

// Character listing for current user
router.get('/my-characters', isAuthenticated, characterController.getUserCharacters);

// Create character form
router.get('/create', isAuthenticated, characterController.getCreateCharacterForm);

// Create character
router.post(
  '/create',
  isAuthenticated,
  [
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Character name is required and cannot exceed 100 characters'),
    body('shortBio')
      .optional()
      .trim()
      .isLength({ max: 255 })
      .withMessage('Short bio cannot exceed 255 characters'),
    body('age')
      .optional()
      .trim()
      .isLength({ max: 30 })
      .withMessage('Age cannot exceed 30 characters'),
    body('gender')
      .optional()
      .trim()
      .isLength({ max: 30 })
      .withMessage('Gender cannot exceed 30 characters'),
    body('avatarUrl')
      .optional()
      .trim()
      .isURL()
      .withMessage('Avatar image must be a valid URL')
  ],
  characterController.createCharacter
);

// Edit character form - Must be before /:id route
router.get('/edit/:id', isAuthenticated, characterController.getEditCharacter);

// Update character
router.put(
  '/edit/:id',
  isAuthenticated,
  [
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Character name is required and cannot exceed 100 characters'),
    body('shortBio')
      .optional()
      .trim()
      .isLength({ max: 255 })
      .withMessage('Short bio cannot exceed 255 characters'),
    body('avatarUrl')
      .optional()
      .trim()
      .isURL()
      .withMessage('Avatar image must be a valid URL')
  ],
  characterController.updateCharacter
);

// Add a route to view pending relationship requests
router.get(
  '/relationship-requests',
  isAuthenticated,
  characterController.getRelationshipRequests
);

// Delete character
router.delete('/delete/:id', isAuthenticated, characterController.deleteCharacter);

// Character relationships - Must be before /:id route
router.get('/:id/relationships', isAuthenticated, characterController.getCharacterRelationships);

// Add relationship
router.post(
  '/:id/relationships',
  isAuthenticated,
  [
    body('character2Id')
      .isNumeric()
      .withMessage('Invalid character selected'),
    body('relationshipType')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Relationship type is required and cannot exceed 50 characters'),
    body('description')
      .optional()
      .trim()
  ],
  characterController.addRelationship
);

// Approve relationship request
router.post(
  '/relationships/:relationshipId/approve',
  isAuthenticated,
  characterController.approveRelationship
);

// Decline relationship request
router.post(
  '/relationships/:relationshipId/decline',
  isAuthenticated,
  characterController.declineRelationship
);

// Update relationship
router.put(
  '/relationships/:relationshipId',
  isAuthenticated,
  [
    body('relationshipType')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Relationship type is required and cannot exceed 50 characters'),
    body('description')
      .optional()
      .trim()
  ],
  characterController.updateRelationship
);

// Delete relationship
router.delete(
  '/relationships/:relationshipId',
  isAuthenticated,
  characterController.deleteRelationship
);

// Character gallery routes - these should go before the /:id route
router.get('/:id/gallery', characterController.getCharacterGallery);
router.get('/:id/gallery/upload', isAuthenticated, characterController.getUploadGalleryImage);
router.post(
  '/:id/gallery/upload',
  isAuthenticated,
  [
    body('imageUrl')
      .trim()
      .isURL()
      .withMessage('Please enter a valid image URL'),
    body('caption')
      .optional()
      .trim()
      .isLength({ max: 255 })
      .withMessage('Caption cannot exceed 255 characters')
  ],
  characterController.uploadGalleryImage
);
router.delete('/:id/gallery/:imageId', isAuthenticated, characterController.deleteGalleryImage);
router.post('/:id/gallery/order', isAuthenticated, characterController.updateGalleryOrder);

// Character playlist routes
router.get('/:id/playlist', characterController.getCharacterPlaylist);
router.post(
  '/:id/playlist',
  isAuthenticated,
  [
    body('songTitle')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Song title is required and cannot exceed 100 characters'),
    body('artistName')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Artist name is required and cannot exceed 100 characters'),
    body('albumName')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Album name cannot exceed 100 characters'),
    body('albumCoverUrl')
      .optional()
      .trim()
      .isURL()
      .withMessage('Please enter a valid album cover URL'),
    body('songUrl')
      .optional()
      .trim()
      .isURL()
      .withMessage('Please enter a valid song URL'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 255 })
      .withMessage('Description cannot exceed 255 characters')
  ],
  characterController.addSongToPlaylist
);
router.delete('/:id/playlist/:songId', isAuthenticated, characterController.removeSongFromPlaylist);

// Character stats routes
router.get('/:id/stats/edit', isAuthenticated, characterController.getEditStats);
router.put(
  '/:id/stats',
  isAuthenticated,
  [
    body('strength')
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage('Strength must be between 0 and 100'),
    body('dexterity')
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage('Dexterity must be between 0 and 100'),
    body('constitution')
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage('Constitution must be between 0 and 100'),
    body('intelligence')
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage('Intelligence must be between 0 and 100'),
    body('wisdom')
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage('Wisdom must be between 0 and 100'),
    body('charisma')
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage('Charisma must be between 0 and 100'),
    body('personalityType')
      .optional()
      .trim()
      .isLength({ max: 20 })
      .withMessage('Personality type cannot exceed 20 characters'),
    body('occupation')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Occupation cannot exceed 100 characters')
  ],
  characterController.updateStats
);

// View character - This must be the last route because it uses a catch-all parameter
router.get('/:id', characterController.getCharacter);

module.exports = router;