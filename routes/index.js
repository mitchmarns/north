const express = require('express');
const router = express.Router();
const { Character, User, Thread, Post } = require('../models');
const { isAuthenticated } = require('../middleware/auth');

// Home page
router.get('/', async (req, res) => {
  try {
    // Get random public characters (limited to 6)
    const randomCharacters = await Character.findAll({
      where: {
        isPrivate: false,
        isArchived: false
      },
      include: [
        {
          model: User,
          attributes: ['username']
        }
      ],
      order: Sequelize.literal('RAND()'), // MySQL's RAND() function for random ordering
      limit: 6
    });

    res.render('index', {
      title: 'Welcome',
      randomCharacters
    });
  } catch (error) {
    console.error('Error fetching home page data:', error);
    res.render('index', {
      title: 'Welcome',
      randomCharacters: []
    });
  }
});

// Dashboard
router.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    // Get user's characters
    const characters = await Character.findAll({
      where: {
        userId: req.user.id
      },
      order: [['updatedAt', 'DESC']],
      limit: 5
    });

    // Get user's threads
    const threads = await Thread.findAll({
      where: {
        creatorId: req.user.id,
        status: 'Active'
      },
      include: [
        {
          model: Post,
          as: 'posts',
          attributes: ['id']
        }
      ],
      order: [['updatedAt', 'DESC']],
      limit: 5
    });

    // Get recent activity
    // In a real app, you would have an Activity model
    // This is a placeholder example
    const activities = [
      {
        type: 'character',
        message: 'You updated character "John Doe"',
        date: new Date(Date.now() - 86400000) // 1 day ago
      },
      {
        type: 'post',
        message: 'You added a new post in "Adventure Begins"',
        date: new Date(Date.now() - 172800000) // 2 days ago
      },
      {
        type: 'thread',
        message: 'You created a new thread "Mystery at Midnight"',
        date: new Date(Date.now() - 259200000) // 3 days ago
      }
    ];

    res.render('dashboard', {
      title: 'Dashboard',
      characters,
      threads,
      activities
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    req.flash('error_msg', 'An error occurred while loading your dashboard');
    res.render('dashboard', {
      title: 'Dashboard',
      characters: [],
      threads: [],
      activities: []
    });
  }
});

// About page
router.get('/about', (req, res) => {
  res.render('about', {
    title: 'About'
  });
});

// Privacy policy
router.get('/privacy', (req, res) => {
  res.render('privacy', {
    title: 'Privacy Policy'
  });
});

// Terms of service
router.get('/terms', (req, res) => {
  res.render('terms', {
    title: 'Terms of Service'
  });
});

module.exports = router;