// controllers/groupMessageController.js
const { 
  GroupConversation, GroupMember, Character, Message, User, Team, sequelize, Sequelize 
} = require('../models');
const { validationResult } = require('express-validator');
const discordNotifier = require('../utils/discordNotifier');
const Op = Sequelize.Op;

// Get a specific group conversation
exports.getGroupConversations = async (req, res) => {
  try {
    console.log('User ID:', req.user.id);
    console.log('Requested Character ID:', req.params.characterId);

    // Get all user's characters with full details
    const characters = await Character.findAll({
      where: {
        userId: req.user.id
      },
      include: [{ model: User, attributes: ['username'] }],
      order: [['createdAt', 'ASC']]
    });

    console.log('Found Characters:', characters.map(c => ({
      id: c.id, 
      name: c.name, 
      isArchived: c.isArchived
    })));

    // If no characters exist
    if (characters.length === 0) {
      console.log('No characters found for user');
      return res.render('messages/group-index', {
        title: 'Group Chats',
        characters: [],
        character: null,
        conversations: [],
        totalUnread: 0
      });
    }

    // Find the specific character or use the first character
    let character;
    if (req.params.characterId) {
      character = characters.find(c => c.id === parseInt(req.params.characterId));
    }

    // If no specific character found, use the first character
    if (!character) {
      console.log('Using first character from the list');
      character = characters[0];
    }

    // Prepare conversations (placeholder logic, replace with your existing implementation)
    const conversations = [];
    const totalUnread = 0;

    // Render the view
    res.render('messages/group-index', {
      title: 'Group Chats',
      characters,
      character,
      conversations,
      totalUnread
    });

  } catch (error) {
    console.error('FULL ERROR in getGroupConversations:', error);
    req.flash('error_msg', `An error occurred: ${error.message}`);
    res.redirect('/dashboard');
  }
};

// Create a new group conversation
exports.createGroupConversation = async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    req.flash('error_msg', errors.array()[0].msg);
    return res.redirect(`/messages/groups/${req.params.characterId}`);
  }
  
  try {
    const characterId = req.params.characterId;
    const { name, description, avatarUrl, invitedCharacterIds } = req.body;
    
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
    
    // Create group conversation
    const group = await GroupConversation.create({
      name,
      description: description || null,
      avatarUrl: avatarUrl || null,
      teamId: null,
      isGlobal: false,
      createdById: req.user.id,
      lastMessageAt: new Date()
    });
    
    // Add creator as a member and admin
    await GroupMember.create({
      groupId: group.id,
      characterId,
      isAdmin: true,
      joinedAt: new Date(),
      lastReadAt: new Date()
    });
    
    // Add other invited characters
    if (invitedCharacterIds && invitedCharacterIds.length > 0) {
      // Ensure it's an array
      const characterIds = Array.isArray(invitedCharacterIds) ? 
                          invitedCharacterIds : [invitedCharacterIds];
      
      // Add each character
      for (const id of characterIds) {
        // Skip if same as creator character
        if (id == characterId) continue;
        
        // Verify the character exists
        const invitedChar = await Character.findByPk(id);
        if (!invitedChar) continue;
        
        await GroupMember.create({
          groupId: group.id,
          characterId: id,
          isAdmin: false,
          joinedAt: new Date(),
          lastReadAt: new Date()
        });
      }
    }
    
    req.flash('success_msg', 'Group conversation created successfully');
    res.redirect(`/messages/groups/${characterId}/${group.id}`);
  } catch (error) {
    console.error('Error creating group conversation:', error);
    req.flash('error_msg', 'An error occurred while creating the group conversation');
    res.redirect(`/messages/groups/${req.params.characterId}`);
  }
};

// Send a message to a group
exports.sendGroupMessage = async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    req.flash('error_msg', errors.array()[0].msg);
    return res.redirect(`/messages/groups/${req.params.characterId}/${req.params.groupId}`);
  }
  
  try {
    const characterId = req.params.characterId;
    const groupId = req.params.groupId;
    const { content, imageUrl } = req.body;
    
    // Verify character exists and belongs to the user
    const character = await Character.findOne({
      where: {
        id: characterId,
        userId: req.user.id
      },
      include: [{ model: User, attributes: ['username'] }]
    });
    
    if (!character) {
      req.flash('error_msg', 'Character not found or not authorized');
      return res.redirect('/characters/my-characters');
    }
    
    // Verify group exists
    const group = await GroupConversation.findByPk(groupId);
    
    if (!group) {
      req.flash('error_msg', 'Group conversation not found');
      return res.redirect(`/messages/groups/${characterId}`);
    }
    
    // Verify character is a member of this group
    const membership = await GroupMember.findOne({
      where: {
        characterId,
        groupId
      }
    });
    
    if (!membership) {
      req.flash('error_msg', 'You are not a member of this group conversation');
      return res.redirect(`/messages/groups/${characterId}`);
    }
    
    // Create the message
    await Message.create({
      senderId: characterId,
      receiverId: null,
      groupId,
      content,
      imageUrl: imageUrl || null,
      isRead: false,
      isDeleted: false
    });
    
    // Update group's lastMessageAt
    await group.update({
      lastMessageAt: new Date()
    });
    
    // Update sender's lastReadAt
    await membership.update({
      lastReadAt: new Date()
    });
    
    // Try to send Discord notification
    try {
      // Get group name and members count for notification
      const membersCount = await GroupMember.count({ where: { groupId } });
      
      discordNotifier.sendNotification(
        `New group message sent!`,
        {
          embeds: [{
            title: `${character.name} sent a message to ${group.name}`,
            description: content.length > 100 ? content.substring(0, 100) + '...' : content,
            color: 0x5a8095, // Your site's header color
            fields: [
              { name: 'From', value: `${character.name} (${character.User.username})`, inline: true },
              { name: 'Group', value: `${group.name} (${membersCount} members)`, inline: true },
            ],
            timestamp: new Date()
          }]
        }
      );
    } catch (notificationError) {
      console.error('Error sending Discord notification:', notificationError);
      // Continue execution - don't let notification failure affect the main flow
    }
    
    // Redirect back to the conversation
    res.redirect(`/messages/groups/${characterId}/${groupId}`);
  } catch (error) {
    console.error('Error sending group message:', error);
    req.flash('error_msg', 'An error occurred while sending your message');
    res.redirect(`/messages/groups/${req.params.characterId}/${req.params.groupId}`);
  }
};

// Join a group conversation with another character
exports.joinGroup = async (req, res) => {
  try {
    const characterId = req.params.characterId;
    const groupId = req.params.groupId;
    const { joinCharacterId } = req.body;
    
    // Verify the current character belongs to the user
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
    
    // Verify the character to join also belongs to the user
    const joinCharacter = await Character.findOne({
      where: {
        id: joinCharacterId,
        userId: req.user.id
      }
    });
    
    if (!joinCharacter) {
      req.flash('error_msg', 'Character not found or not authorized');
      return res.redirect(`/messages/groups/${characterId}/${groupId}`);
    }
    
    // Verify group exists
    const group = await GroupConversation.findByPk(groupId);
    
    if (!group) {
      req.flash('error_msg', 'Group conversation not found');
      return res.redirect(`/messages/groups/${characterId}`);
    }
    
    // Check if character is already a member
    const existingMembership = await GroupMember.findOne({
      where: {
        groupId,
        characterId: joinCharacterId
      }
    });
    
    if (existingMembership) {
      req.flash('error_msg', 'This character is already a member of this group');
      return res.redirect(`/messages/groups/${characterId}/${groupId}`);
    }
    
    // Add the character to the group
    await GroupMember.create({
      groupId,
      characterId: joinCharacterId,
      isAdmin: false, // Not an admin by default
      joinedAt: new Date(),
      lastReadAt: new Date()
    });
    
    // Create a system message to notify everyone
    await Message.create({
      senderId: characterId, // Use the current character as the sender
      receiverId: null,
      groupId,
      content: `${joinCharacter.name} has joined the conversation.`,
      isRead: false,
      isDeleted: false
    });
    
    // Update group's lastMessageAt
    await group.update({
      lastMessageAt: new Date()
    });
    
    req.flash('success_msg', `${joinCharacter.name} has joined the group conversation`);
    res.redirect(`/messages/groups/${characterId}/${groupId}`);
  } catch (error) {
    console.error('Error joining group:', error);
    req.flash('error_msg', 'An error occurred while joining the group');
    res.redirect(`/messages/groups/${req.params.characterId}/${req.params.groupId}`);
  }
};

// Leave a group conversation
exports.leaveGroup = async (req, res) => {
  try {
    const characterId = req.params.characterId;
    const groupId = req.params.groupId;
    
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
    
    // Verify group exists
    const group = await GroupConversation.findByPk(groupId);
    
    if (!group) {
      req.flash('error_msg', 'Group conversation not found');
      return res.redirect(`/messages/groups/${characterId}`);
    }
    
    // Cannot leave global or team chats if you're on that team
    if (group.isGlobal) {
      req.flash('error_msg', 'You cannot leave the global chat');
      return res.redirect(`/messages/groups/${characterId}/${groupId}`);
    }
    
    if (group.teamId && character.teamId === group.teamId) {
      req.flash('error_msg', 'You cannot leave your team chat while on this team');
      return res.redirect(`/messages/groups/${characterId}/${groupId}`);
    }
    
    // Check if character is a member
    const membership = await GroupMember.findOne({
      where: {
        groupId,
        characterId
      }
    });
    
    if (!membership) {
      req.flash('error_msg', 'You are not a member of this group');
      return res.redirect(`/messages/groups/${characterId}`);
    }
    
    // Check if this is the last admin
    if (membership.isAdmin) {
      const adminCount = await GroupMember.count({
        where: {
          groupId,
          isAdmin: true
        }
      });
      
      if (adminCount <= 1) {
        // Get another member to promote to admin
        const anotherMember = await GroupMember.findOne({
          where: {
            groupId,
            characterId: { [Op.ne]: characterId }
          }
        });
        
        if (anotherMember) {
          // Promote another member to admin
          await anotherMember.update({
            isAdmin: true
          });
        } else {
          // If no other members, delete the group (unless it's a team chat)
          if (!group.teamId && !group.isGlobal) {
            await group.destroy();
            req.flash('success_msg', 'You left the group and it was deleted since you were the only member');
            return res.redirect(`/messages/groups/${characterId}`);
          }
        }
      }
    }
    
    // Remove the character from the group
    await membership.destroy();
    
    // Add a system message
    await Message.create({
      senderId: characterId,
      receiverId: null,
      groupId,
      content: `${character.name} has left the conversation.`,
      isRead: false,
      isDeleted: false
    });
    
    // Update group's lastMessageAt
    await group.update({
      lastMessageAt: new Date()
    });
    
    req.flash('success_msg', 'You left the group conversation');
    res.redirect(`/messages/groups/${characterId}`);
  } catch (error) {
    console.error('Error leaving group:', error);
    req.flash('error_msg', 'An error occurred while leaving the group');
    res.redirect(`/messages/groups/${req.params.characterId}/${req.params.groupId}`);
  }
};

// Delete a message
exports.deleteGroupMessage = async (req, res) => {
  try {
    const characterId = req.params.characterId;
    const messageId = req.params.messageId;
    
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
    
    // Find message
    const message = await Message.findByPk(messageId);
    
    if (!message) {
      req.flash('error_msg', 'Message not found');
      return res.redirect(`/messages/groups/${characterId}`);
    }
    
    // Verify it's a group message
    if (!message.groupId) {
      req.flash('error_msg', 'Not a group message');
      return res.redirect(`/messages/groups/${characterId}`);
    }
    
    // Get the group
    const group = await GroupConversation.findByPk(message.groupId);
    
    // Verify user owns either the sender character or is a group admin
    const membership = await GroupMember.findOne({
      where: {
        groupId: message.groupId,
        characterId,
        isAdmin: true
      }
    });
    
    const isAdmin = !!membership;
    const isSender = message.senderId === parseInt(characterId);
    
    if (!isAdmin && !isSender) {
      req.flash('error_msg', 'Not authorized to delete this message');
      return res.redirect(`/messages/groups/${characterId}`);
    }
    
    // Soft delete the message
    await message.update({ isDeleted: true });
    
    req.flash('success_msg', 'Message deleted');
    
    // Redirect back to the conversation
    res.redirect(`/messages/groups/${characterId}/${message.groupId}`);
  } catch (error) {
    console.error('Error deleting group message:', error);
    req.flash('error_msg', 'An error occurred while deleting the message');
    res.redirect(`/messages/groups/${req.params.characterId}`);
  }
};

// Admin: Invite new members to the group
exports.inviteToGroup = async (req, res) => {
  try {
    const characterId = req.params.characterId;
    const groupId = req.params.groupId;
    const { invitedCharacterIds } = req.body;
    
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
    
    // Verify group exists
    const group = await GroupConversation.findByPk(groupId);
    
    if (!group) {
      req.flash('error_msg', 'Group conversation not found');
      return res.redirect(`/messages/groups/${characterId}`);
    }
    
    // Verify character is a member and admin
    const membership = await GroupMember.findOne({
      where: {
        groupId,
        characterId,
        isAdmin: true
      }
    });
    
    if (!membership) {
      req.flash('error_msg', 'You are not an admin of this group');
      return res.redirect(`/messages/groups/${characterId}/${groupId}`);
    }
    
    // Process invited characters
    if (invitedCharacterIds && invitedCharacterIds.length > 0) {
      // Ensure it's an array
      const characterIds = Array.isArray(invitedCharacterIds) ? 
                          invitedCharacterIds : [invitedCharacterIds];
      
      let successCount = 0;
      
      // Add each character
      for (const id of characterIds) {
        // Skip if same as current character
        if (id == characterId) continue;
        
        // Verify the character exists
        const invitedChar = await Character.findByPk(id);
        if (!invitedChar) continue;
        
        // Check if already a member
        const existingMembership = await GroupMember.findOne({
          where: {
            groupId,
            characterId: id
          }
        });
        
        if (existingMembership) continue;
        
        // Add to group
        await GroupMember.create({
          groupId,
          characterId: id,
          isAdmin: false,
          joinedAt: new Date(),
          lastReadAt: new Date()
        });
        
        successCount++;
      }
      
      if (successCount > 0) {
        // Create a system message to notify everyone
        await Message.create({
          senderId: characterId,
          receiverId: null,
          groupId,
          content: `${character.name} added ${successCount} new member${successCount !== 1 ? 's' : ''} to the conversation.`,
          isRead: false,
          isDeleted: false
        });
        
        // Update group's lastMessageAt
        await group.update({
          lastMessageAt: new Date()
        });
        
        req.flash('success_msg', `Successfully added ${successCount} character${successCount !== 1 ? 's' : ''} to the group`);
      } else {
        req.flash('error_msg', 'No new characters were added to the group');
      }
    } else {
      req.flash('error_msg', 'No characters selected');
    }
    
    res.redirect(`/messages/groups/${characterId}/${groupId}`);
  } catch (error) {
    console.error('Error inviting to group:', error);
    req.flash('error_msg', 'An error occurred while inviting to the group');
    res.redirect(`/messages/groups/${req.params.characterId}/${req.params.groupId}`);
  }
};

// Admin: Create the global chat if it doesn't exist
exports.initializeGlobalChat = async (userId) => {
  try {
    // Check if global chat already exists
    let globalChat = await GroupConversation.findOne({
      where: { isGlobal: true }
    });
    
    if (!globalChat) {
      // Create global chat
      globalChat = await GroupConversation.create({
        name: 'Global Chat',
        description: 'Chat with everyone on the site',
        avatarUrl: '/images/global-chat.png', // Replace with a default image path
        teamId: null,
        isGlobal: true,
        createdById: userId,
        lastMessageAt: new Date()
      });
      
      console.log('Global chat created successfully');
    }
    
    return globalChat;
  } catch (error) {
    console.error('Error initializing global chat:', error);
    return null;
  }
};