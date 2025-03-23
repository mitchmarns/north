// routes/social.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const socialController = require('../controllers/socialController');
const { isAuthenticated } = require('../middleware/auth');

// Get social feed page
router.get('/feed', socialController.getFeed);

// Load more posts (AJAX)
router.get('/feed/load-more', socialController.loadMore);

// Create new post
router.post('/post', isAuthenticated, [
  body('postType')
    .isIn(['text', 'image', 'nowListening', 'multiple_images'])
    .withMessage('Invalid post type'),
  body('content')
    .optional({ nullable: true })
    .trim(),
  body('characterId')
    .optional({ nullable: true })
    .isNumeric()
    .withMessage('Invalid character'),
  body('mediaUrls.*')
    .optional({ nullable: true })
    .isURL()
    .withMessage('Invalid image URL format'),
  body('songTitle')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Song title cannot exceed 100 characters'),
  body('artistName')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Artist name cannot exceed 100 characters'),
  body('albumName')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Album name cannot exceed 100 characters'),
  body('albumCoverUrl')
    .optional({ nullable: true })
    .isURL()
    .withMessage('Invalid album cover URL format'),
  body('privacy')
    .isIn(['public', 'private'])
    .withMessage('Invalid privacy setting')
], socialController.createPost);

// View single post
router.get('/post/:id', socialController.getPost);

// Edit post form
router.get('/post/:id/edit', isAuthenticated, socialController.getEditPost);

// Update post
router.put('/post/:id', isAuthenticated, [
  body('content')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Post content cannot be empty'),
  body('characterId')
    .optional({ nullable: true })
    .isNumeric()
    .withMessage('Invalid character'),
  body('imageUrl')
    .optional({ nullable: true })
    .custom((value) => {
      // If value is empty or null, it's valid
      if (!value || value.trim() === '') {
        return true;
      }
      // Otherwise check if it's a URL
      const urlPattern = /^(https?:\/\/)?([\w.-]+)\.([a-z]{2,})(\/\S*)?$/i;
      if (urlPattern.test(value)) {
        return true;
      }
      throw new Error('Invalid image URL format');
    })
    .withMessage('Invalid image URL format'),
  body('privacy')
    .isIn(['public', 'private'])
    .withMessage('Invalid privacy setting')
], socialController.updatePost);

// Delete post
router.delete('/post/:id', isAuthenticated, socialController.deletePost);

// Like or unlike post
router.post('/post/:id/like', isAuthenticated, socialController.likePost);

// Add comment to post
router.post('/post/:id/comment', isAuthenticated, [
  body('content')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Comment cannot be empty'),
  body('commentAsId')
    .optional({ nullable: true })
    .isNumeric()
    .withMessage('Invalid character')
], socialController.addComment);

// Delete comment
router.delete('/comment/:id', isAuthenticated, socialController.deleteComment);

module.exports = router;