// routes/messages.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const messageController = require('../controllers/messageController');
const { isAuthenticated } = require('../middleware/auth');

// Character inbox (all conversations)
router.get('/:characterId', isAuthenticated, messageController.getInbox);

// New message form
router.get('/:characterId/new', isAuthenticated, messageController.newMessageForm);

// View conversation with a specific character
router.get('/:characterId/:partnerId', isAuthenticated, messageController.getConversation);

// Send message
router.post('/send', isAuthenticated, [
  body('content')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Message cannot be empty'),
  body('characterId')
    .isNumeric()
    .withMessage('Invalid sender'),
  body('receiverId')
    .isNumeric()
    .withMessage('Invalid recipient')
], messageController.sendMessage);

// Delete message
router.delete('/:characterId/:messageId', isAuthenticated, messageController.deleteMessage);

module.exports = router;