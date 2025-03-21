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
router.get('/create', isAuthenticated, (req, res) => {
  res.render('characters/create', {
    title: 'Create a New Character'
  });
});

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

// View character - This must be the last route because it uses a catch-all parameter
router.get('/:id', characterController.getCharacter);

module.exports = router;