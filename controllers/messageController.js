// controllers/messageController.js
const messageService = require('../services/messageService');
const { validationResult } = require('express-validator');
const { Character, User, Relationship, Sequelize } = require('../models');

// Get all character's conversations (inbox)
exports.getInbox = async (req, res) => {
  try {
    const inboxData = await messageService.getInbox(req.params.characterId, req.user.id);
    
    res.render('messages/inbox', {
      title: `${inboxData.character.name}'s Messages`,
      ...inboxData
    });
  } catch (error) {
    console.error('Error fetching inbox:', error);
    
    if (error.message === 'Character not found or not authorized') {
      req.flash('error_msg', 'Character not found or not authorized');
    } else {
      req.flash('error_msg', 'An error occurred while fetching messages');
    }
    
    res.redirect('/characters/my-characters');
  }
};

// Get conversation between two characters
exports.getConversation = async (req, res) => {
  try {
    const conversationData = await messageService.getConversation(
      req.params.characterId, 
      req.params.partnerId, 
      req.user.id
    );
    
    res.render('messages/conversation', {
      title: `Messages with ${conversationData.partner.name}`,
      ...conversationData
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    
    if (error.message === 'Character not found or not authorized') {
      req.flash('error_msg', 'Character not found or not authorized');
      return res.redirect('/characters/my-characters');
    } else if (error.message === 'Partner character not found') {
      req.flash('error_msg', 'Partner character not found');
      return res.redirect(`/messages/${req.params.characterId}`);
    } else {
      req.flash('error_msg', 'An error occurred while fetching the conversation');
      return res.redirect(`/messages/${req.params.characterId}`);
    }
  }
};

// Send a new message
exports.sendMessage = async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    req.flash('error_msg', errors.array()[0].msg);
    return res.redirect(req.headers.referer || '/characters/my-characters');
  }
  
  try {
    const message = await messageService.sendMessage(req.body, req.user.id);
    req.flash('success_msg', 'Message sent successfully');
    
    // Redirect back to the conversation
    return res.redirect(`/messages/${req.body.characterId}/${req.body.receiverId}`);
  } catch (error) {
    console.error('Error sending message:', error);
    
    if (error.message === 'Not authorized to send messages as this character') {
      req.flash('error_msg', 'Not authorized to send messages as this character');
      return res.redirect('/characters/my-characters');
    } else if (error.message === 'Recipient character not found') {
      req.flash('error_msg', 'Recipient character not found');
      return res.redirect(`/messages/${req.body.characterId}`);
    } else {
      req.flash('error_msg', 'An error occurred while sending the message');
      return res.redirect(req.headers.referer || `/messages/${req.body.characterId}`);
    }
  }
};

// Delete a message
exports.deleteMessage = async (req, res) => {
  try {
    // Delete message using the service
    await messageService.deleteMessage(req.params.messageId, req.params.characterId, req.user.id);
    
    req.flash('success_msg', 'Message deleted successfully');
    res.redirect(req.headers.referer || `/messages/${req.params.characterId}`);
  } catch (error) {
    console.error('Error deleting message:', error);
    
    if (error.message.includes('not found') || error.message.includes('not authorized')) {
      req.flash('error_msg', error.message);
    } else {
      req.flash('error_msg', 'An error occurred while deleting the message');
    }
    
    res.redirect(req.headers.referer || `/messages/${req.params.characterId}`);
  }
};

// New message form (for starting a new conversation)
exports.newMessageForm = async (req, res) => {
  try {
    const characterId = req.params.characterId;
    
    // Verify character belongs to the user
    const character = await Character.findOne({
      where: {
        id: characterId,
        userId: req.user.id
      }
    });
    
    if (!character) {
      req.flash('error_msg', 'Character not found or not authorized');
      return res.redirect('/characters/my-characters');
    }
    
    // Get potential recipients (connected characters or user's other characters)
    const { Relationship } = require('../models');
    
    // Get all approved relationships
    const relationships = await Relationship.findAll({
      where: {
        [Sequelize.Op.or]: [
          { character1Id: characterId },
          { character2Id: characterId }
        ],
        isApproved: true
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
        }
      ]
    });
    
    // Get user's other characters
    const userCharacters = await Character.findAll({
      where: {
        userId: req.user.id,
        id: { [Sequelize.Op.ne]: characterId }
      }
    });
    
    // Format potential recipients
    const recipients = [];
    
    // Add characters from relationships
    relationships.forEach(rel => {
      const otherCharacter = rel.character1Id === parseInt(characterId) ? rel.character2 : rel.character1;
      
      // Don't add duplicates
      if (!recipients.some(r => r.id === otherCharacter.id)) {
        recipients.push({
          id: otherCharacter.id,
          name: otherCharacter.name,
          avatarUrl: otherCharacter.avatarUrl,
          username: otherCharacter.User ? otherCharacter.User.username : 'Unknown',
          isOwn: otherCharacter.userId === req.user.id
        });
      }
    });
    
    // Add user's other characters
    userCharacters.forEach(char => {
      // Don't add duplicates
      if (!recipients.some(r => r.id === char.id)) {
        recipients.push({
          id: char.id,
          name: char.name,
          avatarUrl: char.avatarUrl,
          username: req.user.username,
          isOwn: true
        });
      }
    });
    
    // Sort recipients by name
    recipients.sort((a, b) => a.name.localeCompare(b.name));
    
    res.render('messages/new', {
      title: 'New Message',
      character,
      recipients
    });
  } catch (error) {
    console.error('Error loading new message form:', error);
    req.flash('error_msg', 'An error occurred while loading the new message form');
    res.redirect(`/messages/${req.params.characterId}`);
  }
};