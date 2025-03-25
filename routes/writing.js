const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { Thread, Post, Character, User } = require('../models');
const { isAuthenticated } = require('../middleware/auth');

// Update GET routes to include tagged characters
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
        },
        {
          model: Character,
          as: 'threadTags',
          attributes: ['id', 'name', 'avatarUrl']
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
        },
        {
          model: Character,
          as: 'threadTags',
          attributes: ['id', 'name', 'avatarUrl']
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

// Create thread route - Add validation and handling for new fields
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
      .trim(),
    body('threadDate')
      .optional()
      .isISO8601()
      .toDate()
      .withMessage('Invalid date format'),
    body('taggedCharacters')
      .optional()
      .custom((value) => {
        // Ensure taggedCharacters is an array of numeric IDs
        if (value) {
          const characterIds = Array.isArray(value) ? value : value.split(',');
          if (!characterIds.every(id => !isNaN(parseInt(id)))) {
            throw new Error('Invalid character IDs');
          }
        }
        return true;
      })
  ],
  async (req, res) => {
    try {
      const { 
        title, description, setting, tags, 
        featuredImage, isPrivate, threadDate, taggedCharacters 
      } = req.body;
      
      // Handle tags (convert comma-separated string to array)
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
            userId: req.user.id
          }
        });
        
        if (validCharacters.length !== taggedCharactersArray.length) {
          req.flash('error_msg', 'Some tagged characters are invalid');
          return res.redirect('/writing/create');
        }
      }
      
      // Create thread
      const thread = await Thread.create({
        creatorId: req.user.id,
        title,
        description: description || null,
        setting: setting || null,
        tags: tagArray,
        featuredImage: featuredImage || null,
        isPrivate: isPrivate === 'on',
        threadDate: threadDate || null,
        lastPostAt: new Date()
      });
      
      // Add tagged characters if any
      if (taggedCharactersArray.length > 0) {
        await thread.addThreadTags(taggedCharactersArray);
      }
      
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
              { name: 'Privacy', value: thread.isPrivate ? 'Private' : 'Public', inline: true },
              { name: 'Thread Date', value: thread.threadDate ? new Date(thread.threadDate).toLocaleDateString() : 'Not specified', inline: true }
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

// Update existing view thread route to include tagged characters
router.get('/thread/:id', async (req, res) => {
  try {
    const thread = await Thread.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['username', 'id']
        },
        {
          model: Character,
          as: 'threadTags',
          attributes: ['id', 'name', 'avatarUrl']
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

// Update thread route - Add support for threadDate and taggedCharacters
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
      .withMessage('Invalid status'),
    body('threadDate')
      .optional()
      .isISO8601()
      .toDate()
      .withMessage('Invalid date format'),
    body('taggedCharacters')
      .optional()
      .custom((value) => {
        // Ensure taggedCharacters is an array of numeric IDs
        if (value) {
          const characterIds = Array.isArray(value) ? value : value.split(',');
          if (!characterIds.every(id => !isNaN(parseInt(id)))) {
            throw new Error('Invalid character IDs');
          }
        }
        return true;
      })
  ],
  async (req, res) => {
    try {
      const { 
        title, description, setting, featuredImage, 
        tags, status, isPrivate, threadDate, taggedCharacters 
      } = req.body;
      
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
            userId: req.user.id
          }
        });
        
        if (validCharacters.length !== taggedCharactersArray.length) {
          req.flash('error_msg', 'Some tagged characters are invalid');
          return res.redirect(`/writing/edit/${req.params.id}`);
        }
      }
      
      // Update thread
      await thread.update({
        title,
        description: description || null,
        setting: setting || null,
        tags: tagArray,
        featuredImage: featuredImage || thread.featuredImage,
        status,
        isPrivate: isPrivate === 'on',
        threadDate: threadDate || null
      });
      
      // Update tagged characters
      if (taggedCharactersArray.length > 0) {
        // Remove existing tagged characters
        await thread.removeThreadTags();
        // Add new tagged characters
        await thread.addThreadTags(taggedCharactersArray);
      } else {
        // Ensure no characters are tagged if array is empty
        await thread.removeThreadTags();
      }
      
      req.flash('success_msg', 'Thread updated successfully');
      res.redirect(`/writing/thread/${thread.id}`);
    } catch (error) {
      console.error('Error updating thread:', error);
      req.flash('error_msg', 'An error occurred while updating the thread');
      res.redirect(`/writing/edit/${req.params.id}`);
    }
  }
);

module.exports = router;