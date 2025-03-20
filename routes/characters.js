const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const multer = require('multer');
const path = require('path');
const characterController = require('../controllers/characterController');
const { isAuthenticated } = require('../middleware/auth');

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/characters');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png|gif/;
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = fileTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// List all characters
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
  upload.single('avatar'),
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
      .withMessage('Gender cannot exceed 30 characters')
  ],
  characterController.createCharacter
);

// View character
router.get('/:id', characterController.getCharacter);

// Edit character form
router.get('/edit/:id', isAuthenticated, characterController.getEditCharacter);

// Update character
router.put(
  '/edit/:id',
  isAuthenticated,
  upload.single('avatar'),
  [
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Character name is required and cannot exceed 100 characters'),
    body('shortBio')
      .optional()
      .trim()
      .isLength({ max: 255 })
      .withMessage('Short bio cannot exceed 255 characters')
  ],
  characterController.updateCharacter
);

// Delete character
router.delete('/delete/:id', isAuthenticated, characterController.deleteCharacter);

// Character relationships
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

module.exports = router;