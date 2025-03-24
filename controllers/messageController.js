// controllers/messageController.js
const { Message, Character, User, Sequelize } = require('../models');
const { validationResult } = require('express-validator');
const discordNotifier = require('../utils/discordNotifier');

// Get all character's conversations (inbox)
exports.getInbox = async (req, res) => {
  try {
    const characterId = req.params.characterId;
    
    // Get character with a single query
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
    
    // Use raw queries for better performance on complex aggregation
    const [sentPartners, receivedPartners, unreadCounts] = await Promise.all([
      Message.findAll({
        where: { senderId: characterId, isDeleted: false },
        attributes: [
          'receiverId',
          [Sequelize.fn('MAX', Sequelize.col('Message.createdAt')), 'lastMessageAt']
        ],
        group: ['receiverId'],
        include: [{
          model: Character,
          as: 'receiver',
          attributes: ['id', 'name', 'avatarUrl'],
          include: [{
            model: User,
            attributes: ['username']
          }]
        }],
        raw: false
      }),
      Message.findAll({
        where: { receiverId: characterId, isDeleted: false },
        attributes: [
          'senderId',
          [Sequelize.fn('MAX', Sequelize.col('Message.createdAt')), 'lastMessageAt']
        ],
        group: ['senderId'],
        include: [{
          model: Character,
          as: 'sender',
          attributes: ['id', 'name', 'avatarUrl'],
          include: [{
            model: User,
            attributes: ['username']
          }]
        }],
        raw: false
      }),
      Message.findAll({
        where: {
          receiverId: characterId,
          isRead: false,
          isDeleted: false
        },
        attributes: [
          'senderId',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'unreadCount']
        ],
        group: ['senderId'],
        raw: true
      })
    ]);
    
    // Process in memory
    const unreadCountMap = {};
    unreadCounts.forEach(count => {
      unreadCountMap[count.senderId] = parseInt(count.unreadCount);
    });
    
    // Combine conversations in memory
    const conversations = processConversations(sentPartners, receivedPartners, unreadCountMap);
    
    // Calculate total unread
    const totalUnread = unreadCounts.reduce((sum, item) => sum + parseInt(item.unreadCount), 0);
    
    res.render('messages/inbox', {
      title: `${character.name}'s Messages`,
      character,
      conversations,
      totalUnread
    });
  } catch (error) {
    console.error('Error fetching inbox:', error);
    req.flash('error_msg', 'An error occurred while fetching messages');
    res.redirect('/characters/my-characters');
  }
};

// Helper function to process conversations
function processConversations(sentPartners, receivedPartners, unreadCountMap) {
  const conversationPartners = new Map();
  
  // Process sent messages
  sentPartners.forEach(message => {
    const partnerId = message.receiver.id;
    const lastMessageAt = message.dataValues.lastMessageAt;
    
    conversationPartners.set(partnerId, {
      character: message.receiver,
      lastMessageAt: lastMessageAt,
      unreadCount: unreadCountMap[partnerId] || 0
    });
  });
  
  // Process received messages
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
  return Array.from(conversationPartners.values())
    .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
}

// Get conversation between two characters
exports.getConversation = async (req, res) => {
  try {
    const characterId = req.params.characterId;
    const partnerId = req.params.partnerId;
    
    // Verify character exists and belongs to the user
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
    
    // Get partner character
    const partner = await Character.findOne({
      where: { id: partnerId },
      include: [
        {
          model: User,
          attributes: ['username', 'id']
        }
      ]
    });
    
    if (!partner) {
      req.flash('error_msg', 'Partner character not found');
      return res.redirect(`/messages/${characterId}`);
    }
    
    // Get messages between characters
    const messages = await Message.findAll({
      where: {
        isDeleted: false,
        [Sequelize.Op.or]: [
          { senderId: characterId, receiverId: partnerId },
          { senderId: partnerId, receiverId: characterId }
        ]
      },
      order: [['createdAt', 'ASC']],
      include: [
        {
          model: Character,
          as: 'sender',
          attributes: ['id', 'name', 'avatarUrl']
        }
      ]
    });
    
    // Mark unread messages as read
    const unreadMessages = await Message.findAll({
      where: {
        senderId: partnerId,
        receiverId: characterId,
        isRead: false,
        groupId: null // Make sure we're only updating direct messages, not group messages
      }
    });

    // Update each message individually to maintain validation
    for (const message of unreadMessages) {
      await message.update({ isRead: true });
    }
    
    // Check if there's a relationship between the characters
    const { Relationship } = require('../models');
    const relationship = await Relationship.findOne({
      where: {
        [Sequelize.Op.or]: [
          { character1Id: characterId, character2Id: partnerId },
          { character1Id: partnerId, character2Id: characterId }
        ],
        isApproved: true
      }
    });
    
    // If no relationship exists between characters that aren't owned by the same user,
    // we might want to restrict messaging or show a warning
    const canMessage = relationship || partner.userId === req.user.id;
    const needsRelationship = !canMessage && partner.userId !== req.user.id;
    
    // Format messages for display
    const formattedMessages = messages.map(message => ({
      id: message.id,
      content: message.content,
      sender: message.sender,
      isMine: message.senderId === parseInt(characterId),
      createdAt: message.createdAt
    }));
    
    res.render('messages/conversation', {
      title: `Messages with ${partner.name}`,
      character,
      partner,
      messages: formattedMessages,
      canMessage,
      needsRelationship,
      isOwner: partner.userId === req.user.id
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    req.flash('error_msg', 'An error occurred while fetching the conversation');
    res.redirect(`/messages/${req.params.characterId}`);
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
    const { characterId, receiverId, content } = req.body;
    
    // Verify sender character belongs to the user
    const character = await Character.findOne({
      where: {
        id: characterId,
        userId: req.user.id
      },
      include: [{ model: User, attributes: ['username'] }]  // Include user for Discord notification
    });
    
    if (!character) {
      req.flash('error_msg', 'Not authorized to send messages as this character');
      return res.redirect('/characters/my-characters');
    }
    
    // Verify receiver exists
    const receiver = await Character.findByPk(receiverId, {
      include: [{ model: User, attributes: ['username'] }]  // Include user for Discord notification
    });
    
    if (!receiver) {
      req.flash('error_msg', 'Recipient character not found');
      return res.redirect(`/messages/${characterId}`);
    }
    
    // Create the message
    await Message.create({
      senderId: characterId,
      receiverId,
      content,
      isRead: false
    });
    
    // Try to send Discord notification
    try {
      discordNotifier.sendNotification(
        `New message sent!`,
        {
          embeds: [{
            title: `${character.name} sent a message to ${receiver.name}`,
            description: content.length > 100 ? content.substring(0, 100) + '...' : content,
            color: 0x5a8095, // Your site's header color
            fields: [
              { name: 'From', value: `${character.name} (${character.User.username})`, inline: true },
              { name: 'To', value: `${receiver.name} (${receiver.User.username})`, inline: true },
            ],
            timestamp: new Date()
          }]
        }
      );
    } catch (notificationError) {
      console.error('Error sending Discord notification:', notificationError);
      // Continue execution - don't let notification failure affect the main flow
    }
    
    // Redirect back to the conversation - only do this once at the end
    return res.redirect(`/messages/${characterId}/${receiverId}`);
    
  } catch (error) {
    console.error('Error sending message:', error);
    req.flash('error_msg', 'An error occurred while sending the message');
    return res.redirect(req.headers.referer || `/messages/${req.body.characterId}`);
  }
};

// Delete a message
exports.deleteMessage = async (req, res) => {
  try {
    const messageId = req.params.messageId;
    const characterId = req.params.characterId;
    
    // Verify character belongs to the user
    const character = await Character.findOne({
      where: {
        id: characterId,
        userId: req.user.id
      }
    });
    
    if (!character) {
      req.flash('error_msg', 'Not authorized');
      return res.redirect('/characters/my-characters');
    }
    
    // Find message
    const message = await Message.findByPk(messageId);
    
    if (!message) {
      req.flash('error_msg', 'Message not found');
      return res.redirect(`/messages/${characterId}`);
    }
    
    // Verify user owns either the sender or receiver character
    if (message.senderId !== parseInt(characterId) && message.receiverId !== parseInt(characterId)) {
      req.flash('error_msg', 'Not authorized to delete this message');
      return res.redirect(`/messages/${characterId}`);
    }
    
    // Soft delete the message
    await message.update({ isDeleted: true });
    
    req.flash('success_msg', 'Message deleted');
    
    // Redirect back to the conversation
    const partnerId = message.senderId === parseInt(characterId) ? message.receiverId : message.senderId;
    res.redirect(`/messages/${characterId}/${partnerId}`);
  } catch (error) {
    console.error('Error deleting message:', error);
    req.flash('error_msg', 'An error occurred while deleting the message');
    res.redirect(`/messages/${req.params.characterId}`);
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