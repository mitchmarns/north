const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { Thread, Post, Character, User } = require('../models');
const { isAuthenticated } = require('../middleware/auth');

// Get all threads
router.get('/threads', async (req, res) => {
  try {
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
        }
      ],
      order: [['updatedAt', 'DESC']]
    });

    res.render('writing/threads', {
      title: 'Threads',
      threads
    });
  } catch (error) {
    console.error('Error fetching threads:', error);
    req.flash('error_msg', 'An error occurred while fetching threads');
    res.redirect('/');
  }
});

// Get user's threads
router.get('/my-threads', isAuthenticated, async (req, res) => {
  try {
    const threads = await Thread.findAll({
      where: {
        creatorId: req.user.id
      },
      include: [
        {
          model: Post,
          as: 'posts',
          attributes: ['id']
        }
      ],
      order: [['updatedAt', 'DESC']]
    });

    res.render('writing/my-threads', {
      title: 'My Threads',
      threads
    });
  } catch (error) {
    console.error('Error fetching user threads:', error);
    req.flash('error_msg', 'An error occurred while fetching your threads');
    res.redirect('/dashboard');
  }
});

// Create thread form
router.get('/create', isAuthenticated, async (req, res) => {
  try {
    // Get user's characters for the character selection
    const characters = await Character.findAll({
      where: {
        userId: req.user.id,
        isArchived: false
      }
    });

    res.render('writing/create', {
      title: 'Create a New Thread',
      characters
    });
  } catch (error) {
    console.error('Error loading create thread form:', error);
    req.flash('error_msg', 'An error occurred while loading the form');
    res.redirect('/writing/my-threads');
  }
});

// Create thread
router.post(
  '/create',
  isAuthenticated,
  [
    body('title')
      .trim()
      .isLength({ min: 1, max: 150 })
      .withMessage('Thread title is required and cannot exceed 150 characters'),
    body('description')
      .optional()
      .trim(),
    body('setting')
      .optional()
      .trim(),
    body('featuredImage')
      .optional()
      .trim()
      .isURL()
      .withMessage('Featured image must be a valid URL'),
    body('tags')
      .optional()
      .trim()
  ],
  async (req, res) => {
    try {
      const { title, description, setting, tags, featuredImage, isPrivate } = req.body;
      
      // Handle tags (convert comma-separated string to array)
      const tagArray = tags ? tags.split(',').map(tag => tag.trim()) : [];
      
      // Create thread
      const thread = await Thread.create({
        creatorId: req.user.id,
        title,
        description: description || null,
        setting: setting || null,
        tags: tagArray,
        featuredImage: featuredImage || null,
        isPrivate: isPrivate === 'on',
        lastPostAt: new Date()
      });
      
      req.flash('success_msg', 'Thread created successfully');
      res.redirect(`/writing/thread/${thread.id}`);

            // After thread is created
      const discordNotifier = require('../utils/discordNotifier');
      
      // Send Discord notification
      discordNotifier.sendNotification(
        `New thread created!`,
        {
          embeds: [{
            title: thread.title,
            description: thread.description || 'No description provided',
            color: 0x5a8095, // Your site's header color
            fields: [
              { name: 'Creator', value: req.user.username, inline: true },
              { name: 'Privacy', value: thread.isPrivate ? 'Private' : 'Public', inline: true }
            ],
            url: `https://your-site.com/writing/thread/${thread.id}`,
            timestamp: new Date()
          }]
        }
      );
      
    } catch (error) {
      console.error('Error creating thread:', error);
      req.flash('error_msg', 'An error occurred while creating the thread');
      res.redirect('/writing/create');
    }
  }
);

// View thread
router.get('/thread/:id', async (req, res) => {
  try {
    const thread = await Thread.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['username', 'id']
        }
      ]
    });
    
    if (!thread) {
      req.flash('error_msg', 'Thread not found');
      return res.redirect('/writing/threads');
    }
    
    // Check if thread is private and user is not the creator
    if (thread.isPrivate && (!req.user || req.user.id !== thread.creatorId)) {
      req.flash('error_msg', 'This thread is private');
      return res.redirect('/writing/threads');
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
    if (req.user) {
      userCharacters = await Character.findAll({
        where: {
          userId: req.user.id,
          isArchived: false
        }
      });
    }
    
    res.render('writing/thread', {
      title: thread.title,
      thread,
      posts,
      userCharacters,
      isCreator: req.user && req.user.id === thread.creatorId
    });
  } catch (error) {
    console.error('Error fetching thread:', error);
    req.flash('error_msg', 'An error occurred while fetching the thread');
    res.redirect('/writing/threads');
  }
});

// Edit thread form
router.get('/edit/:id', isAuthenticated, async (req, res) => {
  try {
    const thread = await Thread.findByPk(req.params.id);
    
    if (!thread) {
      req.flash('error_msg', 'Thread not found');
      return res.redirect('/writing/my-threads');
    }
    
    // Check if user is the creator
    if (thread.creatorId !== req.user.id) {
      req.flash('error_msg', 'Not authorized');
      return res.redirect('/writing/my-threads');
    }
    
    res.render('writing/edit', {
      title: `Edit ${thread.title}`,
      thread
    });
  } catch (error) {
    console.error('Error fetching thread for edit:', error);
    req.flash('error_msg', 'An error occurred while fetching the thread');
    res.redirect('/writing/my-threads');
  }
});

// Update thread
router.put(
  '/edit/:id',
  isAuthenticated,
  [
    body('title')
      .trim()
      .isLength({ min: 1, max: 150 })
      .withMessage('Thread title is required and cannot exceed 150 characters'),
    body('description')
      .optional()
      .trim(),
    body('setting')
      .optional()
      .trim(),
    body('featuredImage')
      .optional()
      .trim()
      .isURL()
      .withMessage('Featured image must be a valid URL'),
    body('tags')
      .optional()
      .trim(),
    body('status')
      .isIn(['Active', 'Paused', 'Completed', 'Abandoned'])
      .withMessage('Invalid status')
  ],
  async (req, res) => {
    try {
      const { title, description, setting, featuredImage, tags, status, isPrivate } = req.body;
      
      // Find thread
      const thread = await Thread.findByPk(req.params.id);
      
      if (!thread) {
        req.flash('error_msg', 'Thread not found');
        return res.redirect('/writing/my-threads');
      }
      
      // Check if user is the creator
      if (thread.creatorId !== req.user.id) {
        req.flash('error_msg', 'Not authorized');
        return res.redirect('/writing/my-threads');
      }
      
      // Handle tags
      const tagArray = tags ? tags.split(',').map(tag => tag.trim()) : [];
      
      // Update thread
      await thread.update({
        title,
        description: description || null,
        setting: setting || null,
        tags: tagArray,
        featuredImage: featuredImage || thread.featuredImage,
        status,
        isPrivate: isPrivate === 'on'
      });
      
      req.flash('success_msg', 'Thread updated successfully');
      res.redirect(`/writing/thread/${thread.id}`);
    } catch (error) {
      console.error('Error updating thread:', error);
      req.flash('error_msg', 'An error occurred while updating the thread');
      res.redirect(`/writing/edit/${req.params.id}`);
    }
  }
);

// Add post to thread
router.post(
  '/thread/:id/post',
  isAuthenticated,
  [
    body('content')
      .trim()
      .isLength({ min: 1 })
      .withMessage('Post content is required'),
    body('characterId')
      .optional()
      .isNumeric()
      .withMessage('Invalid character')
  ],
  async (req, res) => {
    try {
      const { content, characterId } = req.body;
      const threadId = req.params.id;
      
      // Find thread
      const thread = await Thread.findByPk(threadId);
      
      if (!thread) {
        req.flash('error_msg', 'Thread not found');
        return res.redirect('/writing/threads');
      }
      
      // Check if thread is active
      if (thread.status !== 'Active') {
        req.flash('error_msg', 'Cannot post in a non-active thread');
        return res.redirect(`/writing/thread/${threadId}`);
      }
      
      // Verify character belongs to user if provided
      if (characterId) {
        const character = await Character.findByPk(characterId);
        if (!character || character.userId !== req.user.id) {
          req.flash('error_msg', 'Invalid character');
          return res.redirect(`/writing/thread/${threadId}`);
        }
      }
      
      // Create post
      await Post.create({
        threadId,
        userId: req.user.id,
        characterId: characterId || null,
        content
      });
      
      // Update thread's lastPostAt
      await thread.update({
        lastPostAt: new Date()
      });
      
      req.flash('success_msg', 'Reply posted successfully');
      res.redirect(`/writing/thread/${threadId}`);
    } catch (error) {
      console.error('Error posting reply:', error);
      req.flash('error_msg', 'An error occurred while posting your reply');
      res.redirect(`/writing/thread/${req.params.id}`);
    }
  }
);

// Edit post form
router.get('/post/:id/edit', isAuthenticated, async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id, {
      include: [
        {
          model: Thread
        },
        {
          model: Character
        }
      ]
    });
    
    if (!post) {
      req.flash('error_msg', 'Post not found');
      return res.redirect('/writing/my-threads');
    }
    
    // Check if user is the author
    if (post.userId !== req.user.id) {
      req.flash('error_msg', 'Not authorized');
      return res.redirect(`/writing/thread/${post.threadId}`);
    }
    
    // Get user's characters
    const characters = await Character.findAll({
      where: {
        userId: req.user.id,
        isArchived: false
      }
    });
    
    res.render('writing/edit-post', {
      title: 'Edit Post',
      post,
      characters
    });
  } catch (error) {
    console.error('Error fetching post for edit:', error);
    req.flash('error_msg', 'An error occurred while fetching the post');
    res.redirect('/writing/my-threads');
  }
});

// Update post
router.put(
  '/post/:id',
  isAuthenticated,
  [
    body('content')
      .trim()
      .isLength({ min: 1 })
      .withMessage('Post content is required'),
    body('characterId')
      .optional()
      .isNumeric()
      .withMessage('Invalid character')
  ],
  async (req, res) => {
    try {
      const { content, characterId } = req.body;
      
      // Find post
      const post = await Post.findByPk(req.params.id);
      
      if (!post) {
        req.flash('error_msg', 'Post not found');
        return res.redirect('/writing/my-threads');
      }
      
      // Check if user is the author
      if (post.userId !== req.user.id) {
        req.flash('error_msg', 'Not authorized');
        return res.redirect(`/writing/thread/${post.threadId}`);
      }
      
      // Verify character belongs to user if provided
      if (characterId) {
        const character = await Character.findByPk(characterId);
        if (!character || character.userId !== req.user.id) {
          req.flash('error_msg', 'Invalid character');
          return res.redirect(`/writing/post/${post.id}/edit`);
        }
      }
      
      // Update post
      await post.update({
        content,
        characterId: characterId || null
      });
      
      req.flash('success_msg', 'Post updated successfully');
      res.redirect(`/writing/thread/${post.threadId}`);
    } catch (error) {
      console.error('Error updating post:', error);
      req.flash('error_msg', 'An error occurred while updating the post');
      res.redirect(`/writing/post/${req.params.id}/edit`);
    }
  }
);

// Delete post
router.delete('/post/:id', isAuthenticated, async (req, res) => {
  try {
    // Find post
    const post = await Post.findByPk(req.params.id);
    
    if (!post) {
      req.flash('error_msg', 'Post not found');
      return res.redirect('/writing/my-threads');
    }
    
    // Check if user is the author or thread creator
    const thread = await Thread.findByPk(post.threadId);
    
    if (post.userId !== req.user.id && thread.creatorId !== req.user.id) {
      req.flash('error_msg', 'Not authorized');
      return res.redirect(`/writing/thread/${post.threadId}`);
    }
    
    // Delete post
    await post.destroy();
    
    req.flash('success_msg', 'Post deleted successfully');
    res.redirect(`/writing/thread/${post.threadId}`);
  } catch (error) {
    console.error('Error deleting post:', error);
    req.flash('error_msg', 'An error occurred while deleting the post');
    res.redirect(`/writing/thread/${post.threadId}`);
  }
});

// Delete thread
router.delete('/thread/:id', isAuthenticated, async (req, res) => {
  try {
    // Find thread
    const thread = await Thread.findByPk(req.params.id);
    
    if (!thread) {
      req.flash('error_msg', 'Thread not found');
      return res.redirect('/writing/my-threads');
    }
    
    // Check if user is the creator
    if (thread.creatorId !== req.user.id) {
      req.flash('error_msg', 'Not authorized');
      return res.redirect('/writing/my-threads');
    }
    
    // Delete thread (and associated posts due to cascade)
    await thread.destroy();
    
    req.flash('success_msg', 'Thread deleted successfully');
    res.redirect('/writing/my-threads');
  } catch (error) {
    console.error('Error deleting thread:', error);
    req.flash('error_msg', 'An error occurred while deleting the thread');
    res.redirect('/writing/my-threads');
  }
});

module.exports = router;