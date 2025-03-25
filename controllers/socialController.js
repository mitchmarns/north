// controllers/socialController.js
const { SocialPost, Comment, Like, Character, User, sequelize, Sequelize } = require('../models');
const { validationResult } = require('express-validator');
const socialService = require('../services/socialService');
const Op = Sequelize.Op;

// Helper function to format time ago
const formatTimeAgo = (date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now - new Date(date)) / 1000);
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds} second${diffInSeconds !== 1 ? 's' : ''} ago`;
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
  }
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks !== 1 ? 's' : ''} ago`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths !== 1 ? 's' : ''} ago`;
  }
  
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} year${diffInYears !== 1 ? 's' : ''} ago`;
};

// Get social feed
exports.getFeed = async (req, res) => {
  try {
    const filter = req.query.filter || 'all';
    const sort = req.query.sort || 'recent';
    const page = parseInt(req.query.page) || 1;
    
    // Get feed data using the service
    const feedData = await socialService.getFeed(filter, sort, page, req.user?.id);
    
    // Make the formatTimeAgo function available to the template
    res.locals.formatTimeAgo = feedData.formatTimeAgo;
    
    res.render('social/feed', {
      title: 'Activity Feed',
      posts: feedData.posts,
      characters: feedData.characters,
      filter,
      sort
    });
  } catch (error) {
    console.error('Error fetching social feed:', error);
    req.flash('error_msg', 'An error occurred while fetching the social feed');
    res.redirect('/dashboard');
  }
};

// Get load more posts (AJAX)
exports.loadMore = async (req, res) => {
  try {
    const filter = req.query.filter || 'all';
    const sort = req.query.sort || 'recent';
    const page = parseInt(req.query.page) || 2;
    
    // Get more posts using the service
    const postsData = await socialService.loadMorePosts(filter, sort, page, req.user?.id);
    
    res.json({
      success: true,
      posts: postsData.posts
    });
  } catch (error) {
    console.error('Error loading more posts:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while loading more posts'
    });
  }
};

// Create post
exports.createPost = async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    req.flash('error_msg', errors.array()[0].msg);
    return res.redirect('/social/feed');
  }
  
  try {
    // Create post using the service
    await socialService.createPost(req.body, req.user.id);
    
    req.flash('success_msg', 'Post created successfully');
    res.redirect('/social/feed');
  } catch (error) {
    console.error('Error creating post:', error);
    req.flash('error_msg', 'An error occurred while creating your post');
    res.redirect('/social/feed');
  }
};

// View single post
exports.getPost = async (req, res) => {
  try {
    // Get post data using the service
    const postData = await socialService.getPost(req.params.id, req.user?.id);
    
    // Make the formatTimeAgo function available to the template
    res.locals.formatTimeAgo = postData.formatTimeAgo;
    
    res.render('social/post', {
      title: 'View Post',
      post: postData.post,
      characters: postData.characters
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    
    if (error.message === 'Post not found') {
      req.flash('error_msg', 'Post not found');
    } else if (error.message === 'This post is private') {
      req.flash('error_msg', 'This post is private');
    } else {
      req.flash('error_msg', 'An error occurred while fetching the post');
    }
    
    res.redirect('/social/feed');
  }
};

// Edit post form
exports.getEditPost = async (req, res) => {
  try {
    // Get post data for editing using the service
    const editData = await socialService.getPostForEdit(req.params.id, req.user.id);
    
    res.render('social/edit', {
      title: 'Edit Post',
      post: editData.post,
      characters: editData.characters
    });
  } catch (error) {
    console.error('Error fetching post for edit:', error);
    
    if (error.message === 'Post not found') {
      req.flash('error_msg', 'Post not found');
    } else if (error.message === 'Not authorized to edit this post') {
      req.flash('error_msg', 'Not authorized to edit this post');
    } else {
      req.flash('error_msg', 'An error occurred while loading the edit form');
    }
    
    res.redirect('/social/feed');
  }
};

// Update post
exports.updatePost = async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    req.flash('error_msg', errors.array()[0].msg);
    return res.redirect(`/social/post/${req.params.id}/edit`);
  }
  
  try {
    // Update post using the service
    const post = await socialService.updatePost(req.params.id, req.body, req.user.id);
    
    req.flash('success_msg', 'Post updated successfully');
    res.redirect(`/social/post/${post.id}`);
  } catch (error) {
    console.error('Error updating post:', error);
    
    if (error.message === 'Post not found') {
      req.flash('error_msg', 'Post not found');
    } else if (error.message === 'Not authorized to edit this post') {
      req.flash('error_msg', 'Not authorized to edit this post');
    } else {
      req.flash('error_msg', 'An error occurred while updating your post');
    }
    
    res.redirect(`/social/post/${req.params.id}/edit`);
  }
};

// Delete post
exports.deletePost = async (req, res) => {
  try {
    // Delete post using the service
    await socialService.deletePost(req.params.id, req.user.id);
    
    req.flash('success_msg', 'Post deleted successfully');
    res.redirect('/social/feed');
  } catch (error) {
    console.error('Error deleting post:', error);
    
    if (error.message === 'Post not found') {
      req.flash('error_msg', 'Post not found');
    } else if (error.message === 'Not authorized to delete this post') {
      req.flash('error_msg', 'Not authorized to delete this post');
    } else {
      req.flash('error_msg', 'An error occurred while deleting the post');
    }
    
    res.redirect('/social/feed');
  }
};

// Like or unlike post
exports.likePost = async (req, res) => {
  try {
    // Like/unlike post using the service
    const result = await socialService.likePost(req.params.id, req.body.action, req.user.id);
    
    return res.json({ success: true, count: result.count });
  } catch (error) {
    console.error('Error handling post like:', error);
    return res.status(500).json({ success: false, message: 'An error occurred' });
  }
};

// Add comment to post
exports.addComment = async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    req.flash('error_msg', errors.array()[0].msg);
    return res.redirect(`/social/post/${req.params.id}`);
  }
  
  try {
    // Extract comment data
    const commentData = {
      content: req.body.content,
      characterId: req.body.commentAsId
    };
    
    // Add comment using the service
    await socialService.addComment(req.params.id, commentData, req.user.id);
    
    req.flash('success_msg', 'Comment added successfully');
    res.redirect(`/social/post/${req.params.id}`);
  } catch (error) {
    console.error('Error adding comment:', error);
    
    if (error.message.includes('not found') || error.message.includes('Invalid character')) {
      req.flash('error_msg', error.message);
    } else {
      req.flash('error_msg', 'An error occurred while adding your comment');
    }
    
    res.redirect(`/social/post/${req.params.id}`);
  }
};

// Delete comment
exports.deleteComment = async (req, res) => {
  try {
    // Delete comment using the service
    await socialService.deleteComment(req.params.id, req.user.id);
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    
    if (error.message.includes('not found') || error.message.includes('not authorized')) {
      return res.status(403).json({ success: false, message: error.message });
    } else {
      return res.status(500).json({ success: false, message: 'An error occurred' });
    }
  }
};