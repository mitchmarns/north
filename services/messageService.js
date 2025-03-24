// services/messageService.js

const { Message, Character, User, Relationship, Sequelize } = require('../models');
const Op = Sequelize.Op;
const discordNotifier = require('../utils/discordNotifier');

/**
 * Get all conversations for a character (inbox)
 * @param {number} characterId - The character ID
 * @param {number} userId - User ID
 * @returns {Object} Character's conversations
 */
exports.getInbox = async (characterId, userId) => {
  // Verify character exists and belongs to the user
  const character = await Character.findOne({
    where: {
      id: characterId,
      userId: userId
    }
  });
  
  if (!character) {
    throw new Error('Character not found or not authorized');
  }
  
  // Get unique conversation partners
  const sentMessages = await Message.findAll({
    where: { senderId: characterId, isDeleted: false },
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
  
  const receivedMessages = await Message.findAll({
    where: { receiverId: characterId, isDeleted: false },
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
  
  // Get unread counts for each conversation
  const unreadCounts = await Message.findAll({
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
  });
  
  // Convert to map for easy lookup
  const unreadCountMap = {};
  unreadCounts.forEach(count => {
    unreadCountMap[count.senderId] = parseInt(count.unreadCount);
  });
  
  // Combine sent and received contacts into one list
  const conversationPartners = new Map();
  
  // Add recipients of sent messages
  sentMessages.forEach(message => {
    const partnerId = message.receiver.id;
    const lastMessageAt = message.dataValues.lastMessageAt;
    
    conversationPartners.set(partnerId, {
      character: message.receiver,
      lastMessageAt: lastMessageAt,
      unreadCount: unreadCountMap[partnerId] || 0
    });
  });
  
  // Add senders of received messages
  receivedMessages.forEach(message => {
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
  
  // Get total unread message count
  const totalUnread = unreadCounts.reduce((sum, item) => sum + parseInt(item.unreadCount), 0);
  
  return {
    character,
    conversations,
    totalUnread
  };
};

/**
 * Get a conversation between two characters
 * @param {number} characterId - The user's character ID
 * @param {number} partnerId - The partner character ID
 * @param {number} userId - User ID
 * @returns {Object} Conversation data
 */
exports.getConversation = async (characterId, partnerId, userId) => {
  // Verify character exists and belongs to the user
  const character = await Character.findOne({
    where: {
      id: characterId,
      userId: userId
    }
  });
  
  if (!character) {
    throw new Error('Character not found or not authorized');
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
    throw new Error('Partner character not found');
  }
  
  // Get messages between characters
  const messages = await Message.findAll({
    where: {
      isDeleted: false,
      [Op.or]: [
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
  const relationship = await Relationship.findOne({
    where: {
      [Op.or]: [
        { character1Id: characterId, character2Id: partnerId },
        { character1Id: partnerId, character2Id: characterId }
      ],
      isApproved: true
    }
  });
  
  // If no relationship exists between characters that aren't owned by the same user,
  // we might want to restrict messaging or show a warning
  const canMessage = relationship || partner.userId === userId;
  const needsRelationship = !canMessage && partner.userId !== userId;
  
  // Format messages for display
  const formattedMessages = messages.map(message => ({
    id: message.id,
    content: message.content,
    sender: message.sender,
    isMine: message.senderId === parseInt(characterId),
    createdAt: message.createdAt
  }));
  
  return {
    character,
    partner,
    messages: formattedMessages,
    canMessage,
    needsRelationship,
    isOwner: partner.userId === userId
  };
};

/**
 * Send a message between characters
 * @param {Object} messageData - Message data
 * @param {number} userId - User ID
 * @returns {Object} The created message
 */
exports.sendMessage = async (messageData, userId) => {
  const { characterId, receiverId, content } = messageData;
  
  // Verify sender character belongs to the user
  const character = await Character.findOne({
    where: {
      id: characterId,
      userId: userId
    },
    include: [{ model: User, attributes: ['username'] }]  // Include user for Discord notification
  });
  
  if (!character) {
    throw new Error('Not authorized to send messages as this character');
  }
  
  // Verify receiver exists
  const receiver = await Character.findByPk(receiverId, {
    include: [{ model: User, attributes: ['username'] }]  // Include user for Discord notification
  });
  
  if (!receiver) {
    throw new Error('Recipient character not found');
  }
  
  // Create the message
  const message = await Message.create({
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
  
  return message;
};

/**
 * Delete a message (soft delete)
 * @param {number} messageId - The message ID
 * @param {number} characterId - The character ID
 * @param {number} userId - User ID
 * @returns {boolean} Success status
 */
exports.deleteMessage = async (messageId, characterId, userId) => {
  // Verify character belongs to the user
  const character = await Character.findOne({
    where: {
      id: characterId,
      userId: userId
    }
  });
  
  if (!character) {
    throw new Error('Not authorized');
  }
  
  // Find message
  const message = await Message.findByPk(messageId);
  
  if (!message) {
    throw new Error('Message not found');
  }
  
  // Verify user owns either the sender or receiver character
  if (message.senderId !== parseInt(characterId) && message.receiverId !== parseInt(characterId)) {
    throw new Error('Not authorized to delete this message');
  }
  
  // Soft delete the message
  await message.update({ isDeleted: true });
  
  return true;
};

