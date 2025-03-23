// controllers/groupMessageController.js
const { 
  GroupConversation, GroupMember, Character, Message, User, Team, sequelize, Sequelize 
} = require('../models');
const { validationResult } = require('express-validator');
const discordNotifier = require('../utils/discordNotifier');
const Op = Sequelize.Op;

// Get all group conversations for a character
exports.getGroupConversations = async (req, res) => {
  try {
    const characterId = req.params.characterId;
    
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
    
    // Get all group conversations this character is a member of
    const memberships = await GroupMember.findAll({
      where: { characterId },
      include: [
        {
          model: GroupConversation,
          as: 'group',
          include: [
            {
              model: Team,
              attributes: ['id', 'name', 'logo']
            },
            {
              model: User,
              as: 'creator',
              attributes: ['id', 'username']
            }
          ]
        }
      ]
    });
    
    // Format the conversations and get last message & unread count for each
    const conversations = [];
    
    for (const membership of memberships) {
      const group = membership.group;
      
      if (!group) continue; // Skip if group doesn't exist
      
      // Get the last message in this group
      const lastMessage = await Message.findOne({
        where: {
          groupId: group.id,
          isDeleted: false
        },
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
        order: [['createdAt', 'DESC']],
        limit: 1
      });
      
      // Get unread count
      const unreadCount = await Message.count({
        where: {
          groupId: group.id,
          senderId: { [Op.ne]: characterId },
          createdAt: {
            [Op.gt]: membership.lastReadAt || new Date(0)
          },
          isDeleted: false
        }
      });
      
      // Get member count
      const memberCount = await GroupMember.count({
        where: { groupId: group.id }
      });
      
      conversations.push({
        id: group.id,
        name: group.name,
        description: group.description,
        avatarUrl: group.avatarUrl,
        team: group.Team,
        isGlobal: group.isGlobal,
        createdBy: group.creator ? group.creator.username : 'Unknown',
        lastMessage: lastMessage,
        lastMessageAt: lastMessage ? lastMessage.createdAt : group.lastMessageAt,
        unreadCount: unreadCount,
        memberCount: memberCount,
        isAdmin: membership.isAdmin
      });
    }
    
    // Get global chat if it exists
    if (!conversations.some(c => c.isGlobal)) {
      const globalChat = await GroupConversation.findOne({
        where: { isGlobal: true },
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'username']
          }
        ]
      });
      
      if (globalChat) {
        // Check if user is already a member
        const isMember = await GroupMember.findOne({
          where: {
            groupId: globalChat.id,
            characterId
          }
        });
        
        // If not a member, auto-join global chat
        if (!isMember) {
          await GroupMember.create({
            groupId: globalChat.id,
            characterId,
            isAdmin: false,
            joinedAt: new Date(),
            lastReadAt: new Date()
          });
          
          // Re-fetch the global chat data for proper display
          const lastMessage = await Message.findOne({
            where: {
              groupId: globalChat.id,
              isDeleted: false
            },
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
            order: [['createdAt', 'DESC']],
            limit: 1
          });
          
          const memberCount = await GroupMember.count({
            where: { groupId: globalChat.id }
          });
          
          conversations.push({
            id: globalChat.id,
            name: globalChat.name,
            description: globalChat.description,
            avatarUrl: globalChat.avatarUrl,
            team: null,
            isGlobal: true,
            createdBy: globalChat.creator ? globalChat.creator.username : 'Unknown',
            lastMessage: lastMessage,
            lastMessageAt: lastMessage ? lastMessage.createdAt : globalChat.lastMessageAt,
            unreadCount: 0, // No unread messages since we just joined
            memberCount: memberCount,
            isAdmin: false
          });
        }
      }
    }
    
    // If character is on a team, check for team chat
    if (character.teamId) {
      const isTeamChatMember = conversations.some(c => c.team && c.team.id === character.teamId);
      
      if (!isTeamChatMember) {
        // Look up the team info
        const team = await Team.findByPk(character.teamId);
        
        if (team) {
          // Check if team chat exists
          let teamChat = await GroupConversation.findOne({
            where: { teamId: team.id },
            include: [
              {
                model: User,
                as: 'creator',
                attributes: ['id', 'username']
              }
            ]
          });
          
          // If team chat doesn't exist, create it
          if (!teamChat) {
            teamChat = await GroupConversation.create({
              name: `${team.name} Team Chat`,
              description: `Official chat group for ${team.name} members`,
              avatarUrl: team.logo,
              teamId: team.id,
              isGlobal: false,
              createdById: req.user.id,
              lastMessageAt: new Date()
            });
          }
          
          // Add character to team chat
          await GroupMember.create({
            groupId: teamChat.id,
            characterId,
            isAdmin: character.role === 'Staff', // Staff are admins by default
            joinedAt: new Date(),
            lastReadAt: new Date()
          });
          
          // Get member count for newly joined team chat
          const memberCount = await GroupMember.count({
            where: { groupId: teamChat.id }
          });
          
          conversations.push({
            id: teamChat.id,
            name: teamChat.name,
            description: teamChat.description,
            avatarUrl: teamChat.avatarUrl,
            team: team,
            isGlobal: false,
            createdBy: teamChat.creator ? teamChat.creator.username : req.user.username,
            lastMessage: null,
            lastMessageAt: teamChat.lastMessageAt,
            unreadCount: 0, // No unread messages since we just joined
            memberCount: memberCount,
            isAdmin: character.role === 'Staff'
          });
        }
      }
    }
    
    // Sort conversations by last message timestamp (most recent first)
    conversations.sort((a, b) => {
      const aDate = a.lastMessageAt || a.createdAt || new Date(0);
      const bDate = b.lastMessageAt || b.createdAt || new Date(0);
      return new Date(bDate) - new Date(aDate);
    });
    
    // Calculate total unread count
    const totalUnread = conversations.reduce((sum, convo) => sum + convo.unreadCount, 0);
    
    res.render('messages/group-index', {
      title: `${character.name}'s Group Chats`,
      character,
      conversations,
      totalUnread
    });
  } catch (error) {
    console.error('Error fetching group conversations:', error);
    req.flash('error_msg', 'An error occurred while fetching group conversations');
    res.redirect('/characters/my-characters');
  }
};

// Get a specific group conversation
exports.getGroupConversation = async (req, res) => {
  try {
    const characterId = req.params.characterId;
    const groupId = req.params.groupId;
    
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
    
    // Check if character is a member of this group
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
    
    // Get the group conversation details
    const group = await GroupConversation.findByPk(groupId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username']
        },
        {
          model: Team
        }
      ]
    });
    
    if (!group) {
      req.flash('error_msg', 'Group conversation not found');
      return res.redirect(`/messages/groups/${characterId}`);
    }
    
    // Get group members
    const members = await GroupMember.findAll({
      where: { groupId },
      include: [
        {
          model: Character,
          as: 'character',
          include: [
            {
              model: User,
              attributes: ['id', 'username']
            }
          ]
        }
      ],
      order: [['joinedAt', 'ASC']]
    });
    
    // Get messages
    const messages = await Message.findAll({
      where: {
        groupId,
        isDeleted: false
      },
      include: [
        {
          model: Character,
          as: 'sender',
          attributes: ['id', 'name', 'avatarUrl'],
          include: [
            {
              model: User,
              attributes: ['username', 'id']
            }
          ]
        }
      ],
      order: [['createdAt', 'ASC']]
    });
    
    // Format messages for display
    const formattedMessages = messages.map(message => ({
      id: message.id,
      content: message.content,
      imageUrl: message.imageUrl,
      sender: message.sender,
      isMine: message.senderId === parseInt(characterId),
      createdAt: message.createdAt
    }));
    
    // Mark all messages as read
    await membership.update({
      lastReadAt: new Date()
    });
    
    // Get the user's other characters for potentially joining the group
    const userOtherCharacters = await Character.findAll({
      where: {
        userId: req.user.id,
        id: { [Op.ne]: characterId },
        isArchived: false
      }
    });
    
    // For each character, check if they're already in the group
    const otherCharactersWithMembership = [];
    for (const char of userOtherCharacters) {
      const isMember = await GroupMember.findOne({
        where: {
          groupId,
          characterId: char.id
        }
      });
      
      otherCharactersWithMembership.push({
        ...char.toJSON(),
        isMember: !!isMember
      });
    }
    
    res.render('messages/group-conversation', {
      title: group.name,
      character,
      group,
      members,
      messages: formattedMessages,
      isAdmin: membership.isAdmin,
      userOtherCharacters: otherCharactersWithMembership
    });
  } catch (error) {
    console.error('Error fetching group conversation:', error);
    req.flash('error_msg', 'An error occurred while fetching the group conversation');
    res.redirect(`/messages/groups/${req.params.characterId}`);
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