// routes/messages.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const messageController = require('../controllers/messageController');
const { Message, Character, User, Sequelize } = require('../models');
const { isAuthenticated } = require('../middleware/auth');

// New route for messages index/hub
router.get('/', isAuthenticated, async (req, res) => {
  try {
    // Get all user's characters
    const characters = await Character.findAll({
      where: {
        userId: req.user.id,
        isArchived: false
      }
    });
    
    if (characters.length === 0) {
      return res.render('messages/index', {
        title: 'Messages',
        characters: [],
        activeCharacter: null,
        allConversations: [],
        unreadCount: 0
      });
    }
    
    // Get character IDs
    const characterIds = characters.map(char => char.id);
    
    // Get all conversations for all characters
    const allConversations = [];
    let totalUnread = 0;
    
    // Process each character's conversations
    for (const character of characters) {
      // Get unread count for this character
      const unreadCount = await Message.count({
        where: {
          receiverId: character.id,
          isRead: false,
          isDeleted: false
        }
      });
      
      // Add to total unread
      totalUnread += unreadCount;
      
      // Get conversation partners for this character
      const conversations = await getConversationsForCharacter(character.id);
      
      // Add to all conversations
      allConversations.push({
        character,
        conversations,
        unreadCount
      });
    }
    
    // Sort characters by unread message count (highest first)
    allConversations.sort((a, b) => b.unreadCount - a.unreadCount);
    
    // Select the character with unread messages as active, or first character if none have unread
    const activeCharacter = allConversations.find(c => c.unreadCount > 0)?.character || characters[0];
    
    res.render('messages/index', {
      title: 'Messages',
      characters,
      activeCharacter,
      allConversations,
      totalUnread
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    req.flash('error_msg', 'An error occurred while loading messages');
    res.redirect('/dashboard');
  }
});

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