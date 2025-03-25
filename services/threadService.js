// services/threadService.js

const { Thread, Post, Character, User, Sequelize } = require('../models');
const Op = Sequelize.Op;
const discordNotifier = require('../utils/discordNotifier');

/**
 * Get all public threads with pagination
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Object} Threads with pagination data
 */
exports.getAllThreads = async (page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  
  // Get total count for pagination
  const totalCount = await Thread.count({
    where: {
      isPrivate: false
    }
  });
  
  // Get threads
  const threads = await Thread.findAll({
    where: {
      isPrivate: false
    },
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['username']
      },
      {
        model: Post,
        as: 'posts',
        attributes: ['id']
      },
      {
        model: Character,
        as: 'threadTags',  // Updated from 'taggedCharacters'
        attributes: ['id', 'name', 'avatarUrl']
      }
    ],
    order: [['lastPostAt', 'DESC']],
    limit,
    offset
  });
  
  // Calculate pagination metadata
  const totalPages = Math.ceil(totalCount / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  
  return {
    threads,
    pagination: {
      totalCount,
      totalPages,
      currentPage: page,
      hasNextPage,
      hasPrevPage,
      limit
    }
  };
};

/**
 * Get user's threads with pagination
 * @param {number} userId - User ID
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Object} User's threads with pagination data
 */
exports.getUserThreads = async (userId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  
  // Get total count for pagination
  const totalCount = await Thread.count({
    where: {
      creatorId: userId
    }
  });
  
  // Get threads
  const threads = await Thread.findAll({
    where: {
      creatorId: userId
    },
    include: [
      {
        model: Post,
        as: 'posts',
        attributes: ['id']
      },
      {
        model: Character,
        as: 'threadTags',  // Updated from 'taggedCharacters'
        attributes: ['id', 'name', 'avatarUrl']
      }
    ],
    order: [['lastPostAt', 'DESC']],
    limit,
    offset
  });
  
  // Calculate pagination metadata
  const totalPages = Math.ceil(totalCount / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  
  return {
    threads,
    pagination: {
      totalCount,
      totalPages,
      currentPage: page,
      hasNextPage,
      hasPrevPage,
      limit
    }
  };
};

/**
 * Get a single thread with posts
 * @param {number} threadId - Thread ID
 * @param {number|null} userId - User ID (optional, for determining access)
 * @returns {Object} Thread with posts
 */
exports.getThread = async (threadId, userId = null) => {
  // Get thread
  const thread = await Thread.findByPk(threadId, {
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['username', 'id']
      },
      {
        model: Character,
        as: 'threadTags',  // Updated from 'taggedCharacters'
        attributes: ['id', 'name', 'avatarUrl']
      }
    ]
  });
  
  if (!thread) {
    throw new Error('Thread not found');
  }
  
  // Check if thread is private and user is not the creator
  if (thread.isPrivate && (!userId || userId !== thread.creatorId)) {
    throw new Error('This thread is private');
  }
  
  // Get posts for the thread
  const posts = await Post.findAll({
    where: {
      threadId: thread.id
    },
    include: [
      {
        model: User,
        attributes: ['username']
      },
      {
        model: Character,
        attributes: ['id', 'name', 'avatarUrl']
      }
    ],
    order: [['createdAt', 'ASC']]
  });
  
  // Get user's characters for reply form
  let userCharacters = [];
  if (userId) {
    userCharacters = await Character.findAll({
      where: {
        userId: userId,
        isArchived: false
      }
    });
  }
  
  return {
    thread,
    posts,
    userCharacters,
    isCreator: userId === thread.creatorId
  };
};

/**
 * Create a new thread
 * @param {Object} threadData - Thread data
 * @param {number} userId - User ID
 * @returns {Object} The created thread
 */
exports.createThread = async (threadData, userId) => {
  const { 
    title, description, setting, tags, featuredImage, 
    isPrivate, threadDate, taggedCharacters 
  } = threadData;
  
  // Validate title
  if (!title || title.trim() === '') {
    throw new Error('Thread title is required');
  }
  
  // Process tags (convert comma-separated string to array)
  const tagArray = tags ? tags.split(',').map(tag => tag.trim()) : [];
  
  // Prepare tagged characters array
  const taggedCharactersArray = taggedCharacters 
    ? (Array.isArray(taggedCharacters) 
      ? taggedCharacters 
      : taggedCharacters.split(',').map(id => parseInt(id)))
    : [];
  
  // Validate tagged characters belong to the user
  if (taggedCharactersArray.length > 0) {
    const validCharacters = await Character.findAll({
      where: {
        id: taggedCharactersArray,
        userId: userId
      }
    });
    
    if (validCharacters.length !== taggedCharactersArray.length) {
      throw new Error('Some tagged characters are invalid');
    }
  }
  
  // Create thread
  const thread = await Thread.create({
    creatorId: userId,
    title,
    description: description || null,
    setting: setting || null,
    tags: tagArray,
    featuredImage: featuredImage || null,
    isPrivate: isPrivate === 'on' || isPrivate === true,
    status: 'Active',
    threadDate: threadDate || null,
    lastPostAt: new Date()
  });
  
  // Add tagged characters if any
  if (taggedCharactersArray.length > 0) {
    await thread.addThreadTags(taggedCharactersArray);  // Updated from 'addTaggedCharacters'
  }
  
  // Send Discord notification
  try {
    // Get creator username
    const creator = await User.findByPk(userId, { attributes: ['username'] });
    
    discordNotifier.sendNotification(
      `New thread created!`,
      {
        embeds: [{
          title: thread.title,
          description: thread.description || 'No description provided',
          color: 0x5a8095, // Your site's header color
          fields: [
            { name: 'Creator', value: creator ? creator.username : 'Unknown', inline: true },
            { name: 'Privacy', value: thread.isPrivate ? 'Private' : 'Public', inline: true },
            { name: 'Tags', value: thread.tags.length > 0 ? thread.tags.join(', ') : 'None', inline: true },
            { name: 'Thread Date', value: thread.threadDate ? new Date(thread.threadDate).toLocaleDateString() : 'Not specified', inline: true }
          ],
          thumbnail: {
            url: thread.featuredImage || ''
          },
          timestamp: new Date()
        }]
      }
    );
  } catch (notificationError) {
    console.error('Error sending thread creation notification:', notificationError);
    // Continue execution even if notification fails
  }
  
  return thread;
};

/**
 * Update an existing thread
 * @param {number} threadId - Thread ID
 * @param {Object} threadData - Updated thread data
 * @param {number} userId - User ID
 * @returns {Object} The updated thread
 */
exports.updateThread = async (threadId, threadData, userId) => {
  const { 
    title, description, setting, featuredImage, 
    tags, status, isPrivate, threadDate, taggedCharacters 
  } = threadData;
  
  // Find thread
  const thread = await Thread.findByPk(threadId);
  
  if (!thread) {
    throw new Error('Thread not found');
  }
  
  // Check if user is the creator
  if (thread.creatorId !== userId) {
    throw new Error('Not authorized to edit this thread');
  }
  
  // Process tags
  const tagArray = tags ? tags.split(',').map(tag => tag.trim()) : thread.tags;
  
  // Prepare tagged characters array
  const taggedCharactersArray = taggedCharacters 
    ? (Array.isArray(taggedCharacters) 
      ? taggedCharacters 
      : taggedCharacters.split(',').map(id => parseInt(id)))
    : [];
  
  // Validate tagged characters belong to the user
  if (taggedCharactersArray.length > 0) {
    const validCharacters = await Character.findAll({
      where: {
        id: taggedCharactersArray,
        userId: userId
      }
    });
    
    if (validCharacters.length !== taggedCharactersArray.length) {
      throw new Error('Some tagged characters are invalid');
    }
  }
  
  // Update thread
  await thread.update({
    title: title || thread.title,
    description: description !== undefined ? description : thread.description,
    setting: setting !== undefined ? setting : thread.setting,
    tags: tagArray,
    featuredImage: featuredImage || thread.featuredImage,
    status: status || thread.status,
    isPrivate: isPrivate === 'on' || isPrivate === true,
    threadDate: threadDate || thread.threadDate
  });
  
  // Update tagged characters
  if (taggedCharactersArray.length > 0) {
    // Remove existing tagged characters
    await thread.setThreadTags([]);  // Updated from 'setTaggedCharacters'
    // Add new tagged characters
    await thread.addThreadTags(taggedCharactersArray);  // Updated from 'addTaggedCharacters'
  } else {
    // Remove all tagged characters if array is empty
    await thread.setThreadTags([]);  // Updated from 'setTaggedCharacters'
  }
  
  return thread;
};

/**
 * Delete a thread
 * @param {number} threadId - Thread ID
 * @param {number} userId - User ID
 * @returns {boolean} Success status
 */
exports.deleteThread = async (threadId, userId) => {
  // Find thread
  const thread = await Thread.findByPk(threadId);
  
  if (!thread) {
    throw new Error('Thread not found');
  }
  
  // Check if user is the creator
  if (thread.creatorId !== userId) {
    throw new Error('Not authorized to delete this thread');
  }
  
  // Delete thread (and associated posts due to cascade)
  await thread.destroy();
  
  return true;
};

/**
 * Add a post to a thread
 * @param {number} threadId - Thread ID
 * @param {Object} postData - Post data
 * @param {number} userId - User ID
 * @returns {Object} The created post
 */
exports.addPost = async (threadId, postData, userId) => {
  const { content, characterId } = postData;
  
  // Validate content
  if (!content || content.trim() === '') {
    throw new Error('Post content is required');
  }
  
  // Find thread
  const thread = await Thread.findByPk(threadId);
  
  if (!thread) {
    throw new Error('Thread not found');
  }
  
  // Check if thread is active
  if (thread.status !== 'Active') {
    throw new Error(`Cannot post in a ${thread.status.toLowerCase()} thread`);
  }
  
  // Verify character belongs to user if provided
  if (characterId) {
    const character = await Character.findOne({
      where: {
        id: characterId,
        userId: userId
      }
    });
    
    if (!character) {
      throw new Error('Invalid character selection');
    }
  }
  
  // Create post
  const post = await Post.create({
    threadId,
    userId,
    characterId: characterId || null,
    content
  });
  
  // Update thread's lastPostAt
  await thread.update({
    lastPostAt: new Date()
  });
  
  // Send Discord notification
  try {
    // Get poster info
    const poster = await User.findByPk(userId, { attributes: ['username'] });
    
    // Get character info if applicable
    let characterName = 'None';
    if (characterId) {
      const character = await Character.findByPk(characterId, { attributes: ['name'] });
      if (character) {
        characterName = character.name;
      }
    }
    
    discordNotifier.sendNotification(
      `New post in "${thread.title}"`,
      {
        embeds: [{
          title: `New Post in Thread: ${thread.title}`,
          description: content.length > 100 ? content.substring(0, 100) + '...' : content,
          color: 0x5a8095, // Your site's header color
          fields: [
            { name: 'Author', value: poster ? poster.username : 'Unknown', inline: true },
            { name: 'Character', value: characterName, inline: true },
            { name: 'Thread Status', value: thread.status, inline: true }
          ],
          timestamp: new Date()
        }]
      }
    );
  } catch (notificationError) {
    console.error('Error sending post notification:', notificationError);
    // Continue execution even if notification fails
  }
  
  return post;
};

/**
 * Edit a post
 * @param {number} postId - Post ID
 * @param {Object} postData - Updated post data
 * @param {number} userId - User ID
 * @returns {Object} The updated post
 */
exports.editPost = async (postId, postData, userId) => {
  const { content, characterId } = postData;
  
  // Validate content
  if (!content || content.trim() === '') {
    throw new Error('Post content is required');
  }
  
  // Find post
  const post = await Post.findByPk(postId);
  
  if (!post) {
    throw new Error('Post not found');
  }
  
  // Check if user is the author
  if (post.userId !== userId) {
    throw new Error('Not authorized to edit this post');
  }
  
  // Verify character belongs to user if provided
  if (characterId) {
    const character = await Character.findOne({
      where: {
        id: characterId,
        userId: userId
      }
    });
    
    if (!character) {
      throw new Error('Invalid character selection');
    }
  }
  
  // Update post
  await post.update({
    content,
    characterId: characterId || null,
    isEdited: true,
    lastEditedAt: new Date()
  });
  
  return post;
};

/**
 * Delete a post
 * @param {number} postId - Post ID
 * @param {number} userId - User ID
 * @returns {Object} The thread the post belonged to
 */
exports.deletePost = async (postId, userId) => {
  // Find post
  const post = await Post.findByPk(postId);
  
  if (!post) {
    throw new Error('Post not found');
  }
  
  // Find thread (to check if user is thread creator)
  const thread = await Thread.findByPk(post.threadId);
  
  if (!thread) {
    throw new Error('Thread not found');
  }
  
  // Check if user is the author or thread creator
  if (post.userId !== userId && thread.creatorId !== userId) {
    throw new Error('Not authorized to delete this post');
  }
  
  // Delete post
  await post.destroy();
  
  return thread;
};

/**
 * Get active threads for dashboard
 * @param {number} userId - User ID
 * @param {number} limit - Number of threads to return
 * @returns {Array} Active threads
 */
exports.getActiveThreads = async (userId, limit = 5) => {
  return await Thread.findAll({
    where: {
      creatorId: userId,
      status: 'Active'
    },
    include: [
      {
        model: Post,
        as: 'posts',
        attributes: ['id']
      }
    ],
    order: [['lastPostAt', 'DESC']],
    limit
  });
};

/**
 * Calculate post word count
 * @param {string} content - Post content
 * @returns {number} Word count
 */
exports.calculateWordCount = (content) => {
  if (!content) return 0;
  return content.split(/\s+/).filter(Boolean).length;
};