// routes/messages.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const messageController = require('../controllers/messageController');
const { Character, User, Message, Sequelize } = require('../models');
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
        allConversations: []
      });
    }
    
    // Get character IDs
    const characterIds = characters.map(char => char.id);
    
    // Get all conversations for all characters
    const allConversations = [];
    
    // Get total unread count for all characters
    const totalUnread = await Message.count({
      where: {
        receiverId: { [Sequelize.Op.in]: characterIds },
        isRead: false,
        isDeleted: false
      }
    });
    
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
      
      // Get conversation partners for this character
      const sentPartners = await Message.findAll({
        where: { 
          senderId: character.id,
          isDeleted: false 
        },
        attributes: [
          'receiverId',
          [Sequelize.fn('MAX', Sequelize.col('Message.createdAt')), 'lastMessageAt']
        ],
        group: ['receiverId'],
        include: [
          {
            model: Character,
            as: 'receiver',
            attributes: ['id', 'name', 'avatarUrl'],
            include: [
              {
                model: User,
                attributes: ['username']
              }
            ]
          }
        ],
        raw: false
      });
      
      const receivedPartners = await Message.findAll({
        where: { 
          receiverId: character.id,
          isDeleted: false 
        },
        attributes: [
          'senderId',
          [Sequelize.fn('MAX', Sequelize.col('Message.createdAt')), 'lastMessageAt']
        ],
        group: ['senderId'],
        include: [
          {
            model: Character,
            as: 'sender',
            attributes: ['id', 'name', 'avatarUrl'],
            include: [
              {
                model: User,
                attributes: ['username']
              }
            ]
          }
        ],
        raw: false
      });
      
      // Get unread counts for conversations
      const unreadCounts = await Message.findAll({
        where: {
          receiverId: character.id,
          isRead: false,
          isDeleted: false
        },
        attributes: [
          'senderId',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'unreadCount']
        ],
        group: ['senderId'],
        raw: true
      });
      
      // Convert to map for easy lookup
      const unreadCountMap = {};
      unreadCounts.forEach(count => {
        unreadCountMap[count.senderId] = parseInt(count.unreadCount);
      });
      
      // Combine sent and received partners
      const conversationPartners = new Map();
      
      // Add recipients of sent messages
      sentPartners.forEach(message => {
        const partnerId = message.receiver.id;
        const lastMessageAt = message.dataValues.lastMessageAt;
        
        conversationPartners.set(partnerId, {
          character: message.receiver,
          lastMessageAt: lastMessageAt,
          unreadCount: unreadCountMap[partnerId] || 0
        });
      });
      
      // Add senders of received messages
      receivedPartners.forEach(message => {
        const partnerId = message.sender.id;
        const lastMessageAt = message.dataValues.lastMessageAt;
        
        if (conversationPartners.has(partnerId)) {
          // Update if this message is more recent
          const existing = conversationPartners.get(partnerId);
          if (new Date(lastMessageAt) > new Date(existing.lastMessageAt)) {
            existing.lastMessageAt = lastMessageAt;
          }
        } else {
          conversationPartners.set(partnerId, {
            character: message.sender,
            lastMessageAt: lastMessageAt,
            unreadCount: unreadCountMap[partnerId] || 0
          });
        }
      });
      
      // Convert to array and sort by most recent
      const conversations = Array.from(conversationPartners.values())
        .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
      
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