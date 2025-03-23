// controllers/socialController.js
const { SocialPost, Comment, Like, Character, User, sequelize, Sequelize } = require('../models');
const { validationResult } = require('express-validator');
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
    const limit = a0;
    const offset = (page - 1) * limit;
    
    // Build query based on filter type
    let whereClause = {};
    
    if (filter === 'mine' && req.user) {
      // Only show user's posts
      whereClause.userId = req.user.id;
    } else if (filter === 'following' && req.user) {
      // Show posts from followed users/characters
      // This would need a follows model/table
      // For now, just show all public posts
      whereClause.privacy = 'public';
    } else {
      // Show all public posts by default
      whereClause.privacy = 'public';
    }
    
    // Build order based on sort type
    let order = [];
    
    if (sort === 'popular') {
      order = [['likeCount', 'DESC'], ['createdAt', 'DESC']];
    } else {
      // Recent is default
      order = [['createdAt', 'DESC']];
    }
    
    // Get posts with user, character and comments
    const rawPosts = await SocialPost.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          attributes: ['id', 'username']
        },
        {
          model: Character,
          attributes: ['id', 'name', 'avatarUrl']
        },
        {
          model: Comment,
          as: 'comments',
          separate: true,
          include: [
            {
              model: User,
              attributes: ['id', 'username']
            },
            {
              model: Character,
              attributes: ['id', 'name', 'avatarUrl']
            }
          ],
          limit: 3,
          order: [['createdAt', 'DESC']]
        }
      ],
      order: order,
      limit: limit,
      offset: offset
    });
    
    // Format the posts to ensure user and character data is properly accessible
    const posts = rawPosts.map(post => {
      const formattedPost = post.toJSON();
      
      // Ensure user object is always present with required fields
      if (!formattedPost.User) {
        formattedPost.user = {
          id: formattedPost.userId,
          username: 'Unknown User'
        };
      } else {
        formattedPost.user = formattedPost.User;
      }
      
      // Ensure character data is correctly assigned if it exists
      if (formattedPost.Character) {
        formattedPost.character = formattedPost.Character;
      }
      
      // Format comments to ensure user and character data
      if (formattedPost.comments && formattedPost.comments.length > 0) {
        formattedPost.comments = formattedPost.comments.map(comment => {
          if (comment.User) {
            comment.user = comment.User;
          } else {
            comment.user = { id: comment.userId, username: 'Unknown User' };
          }
          
          if (comment.Character) {
            comment.character = comment.Character;
          }
          
          return comment;
        });
      }
      
      return formattedPost;
    });
    
    // Set default values for template parameters
    let characters = [];
    
    // If user is logged in, check if they liked each post
    if (req.user) {
      // Get all likes from the user for these posts
      const postIds = posts.map(post => post.id);
      const userLikes = await Like.findAll({
        where: {
          userId: req.user.id,
          postId: { [Op.in]: postIds }
        }
      });
      
      // Create a map of post IDs to liked status
      const likedMap = {};
      userLikes.forEach(like => {
        likedMap[like.postId] = true;
      });
      
      // Add hasLiked property to each post
      posts.forEach(post => {
        post.hasLiked = likedMap[post.id] || false;
      });
      
      // Get user's characters for posting/commenting
      characters = await Character.findAll({
        where: {
          userId: req.user.id,
          isArchived: false
        },
        attributes: ['id', 'name', 'avatarUrl']
      });
    }
    
    // Make the formatTimeAgo function available to the template
    res.locals.formatTimeAgo = formatTimeAgo;
    
    // Always pass characters variable to template, even if empty array
    res.render('social/feed', {
      title: 'Activity Feed',
      posts,
      characters,  // This will now always be defined
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
    const limit = 10;
    const offset = (page - 1) * limit;
    
    // Build query based on filter type
    let whereClause = {};
    
    if (filter === 'mine' && req.user) {
      // Only show user's posts
      whereClause.userId = req.user.id;
    } else if (filter === 'following' && req.user) {
      // Show posts from followed users/characters
      // This would need a follows model/table
      // For now, just show all public posts
      whereClause.privacy = 'public';
    } else {
      // Show all public posts by default
      whereClause.privacy = 'public';
    }
    
    // Build order based on sort type
    let order = [];
    
    if (sort === 'popular') {
      order = [['likeCount', 'DESC'], ['createdAt', 'DESC']];
    } else {
      // Recent is default
      order = [['createdAt', 'DESC']];
    }
    
    // Get posts with user, character and comments
    const rawPosts = await SocialPost.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          attributes: ['id', 'username']
        },
        {
          model: Character,
          attributes: ['id', 'name', 'avatarUrl']
        }
      ],
      order: order,
      limit: limit,
      offset: offset
    });
    
    // Format the posts to ensure user and character data is properly accessible
    const posts = rawPosts.map(post => {
      const formattedPost = post.toJSON();
      
      // Ensure user object is always present with required fields
      if (!formattedPost.User) {
        formattedPost.user = {
          id: formattedPost.userId,
          username: 'Unknown User'
        };
      } else {
        formattedPost.user = formattedPost.User;
      }
      
      // Ensure character data is correctly assigned if it exists
      if (formattedPost.Character) {
        formattedPost.character = formattedPost.Character;
      }
      
      return formattedPost;
    });
    
    // If user is logged in, check if they liked each post
    if (req.user) {
      // Get all likes from the user for these posts
      const postIds = posts.map(post => post.id);
      const userLikes = await Like.findAll({
        where: {
          userId: req.user.id,
          postId: { [Op.in]: postIds }
        }
      });
      
      // Create a map of post IDs to liked status
      const likedMap = {};
      userLikes.forEach(like => {
        likedMap[like.postId] = true;
      });
      
      // Add hasLiked property to each post
      posts.forEach(post => {
        post.hasLiked = likedMap[post.id] || false;
      });
    }
    
    // Return JSON response
    res.json({
      success: true,
      posts: posts
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
// controllers/socialController.js - Update the createPost method

exports.createPost = async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    req.flash('error_msg', errors.array()[0].msg);
    return res.redirect('/social/feed');
  }
  
  try {
    const { 
      content, characterId, privacy, postType, 
      imageCaption, mediaUrls, 
      songTitle, artistName, albumName, albumCoverUrl, musicThoughts 
    } = req.body;
    
    // Verify character belongs to user if provided
    if (characterId) {
      const character = await Character.findOne({
        where: {
          id: characterId,
          userId: req.user.id
        }
      });
      
      if (!character) {
        req.flash('error_msg', 'Invalid character selection');
        return res.redirect('/social/feed');
      }
    }
    
    // Prepare post data based on type
    let postData = {
      userId: req.user.id,
      characterId: characterId || null,
      privacy: privacy || 'public',
      postType: postType || 'text',
      likeCount: 0,
      commentCount: 0
    };
    
    // Add content based on post type
    switch (postType) {
      case 'text':
        postData.content = content;
        break;
        
      case 'image':
        postData.content = imageCaption || null;
        
        // Handle multiple images
        if (Array.isArray(mediaUrls)) {
          // Filter out empty URLs
          const filteredUrls = mediaUrls.filter(url => url && url.trim() !== '');
          
          if (filteredUrls.length === 0) {
            req.flash('error_msg', 'At least one image URL is required for image posts');
            return res.redirect('/social/feed');
          }
          
          postData.mediaUrls = filteredUrls;
        } else if (typeof mediaUrls === 'string' && mediaUrls.trim() !== '') {
          postData.mediaUrls = [mediaUrls.trim()];
        } else {
          req.flash('error_msg', 'At least one image URL is required for image posts');
          return res.redirect('/social/feed');
        }
        break;
        
      case 'nowListening':
        postData.content = musicThoughts || null;
        postData.songTitle = songTitle;
        postData.artistName = artistName;
        postData.albumName = albumName || null;
        postData.albumCoverUrl = albumCoverUrl || null;
        
        if (!songTitle || !artistName) {
          req.flash('error_msg', 'Song title and artist name are required for music posts');
          return res.redirect('/social/feed');
        }
        break;
        
      default:
        postData.content = content;
    }
    
    // Create post
    await SocialPost.create(postData);
    
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
    const rawPost = await SocialPost.findByPk(req.params.id, {
      include: [
        {
          model: User,
          attributes: ['id', 'username']
        },
        {
          model: Character,
          attributes: ['id', 'name', 'avatarUrl']
        },
        {
          model: Comment,
          as: 'comments',
          include: [
            {
              model: User,
              attributes: ['id', 'username']
            },
            {
              model: Character,
              attributes: ['id', 'name', 'avatarUrl']
            }
          ],
          order: [['createdAt', 'ASC']]
        }
      ]
    });
    
    if (!rawPost) {
      req.flash('error_msg', 'Post not found');
      return res.redirect('/social/feed');
    }
    
    // Format the post data to ensure it's properly structured
    const post = rawPost.toJSON();
    
    // Ensure user object is always present with required fields
    if (!post.User) {
      post.user = {
        id: post.userId,
        username: 'Unknown User'
      };
    } else {
      post.user = post.User;
    }
    
    // Ensure character data is correctly assigned if it exists
    if (post.Character) {
      post.character = post.Character;
    }
    
    // Format comments to ensure user and character data
    if (post.comments && post.comments.length > 0) {
      post.comments = post.comments.map(comment => {
        if (comment.User) {
          comment.user = comment.User;
        } else {
          comment.user = { id: comment.userId, username: 'Unknown User' };
        }
        
        if (comment.Character) {
          comment.character = comment.Character;
        }
        
        return comment;
      });
    }
    
    // Check if post is private and user is not the creator
    if (post.privacy === 'private' && (!req.user || post.userId !== req.user.id)) {
      req.flash('error_msg', 'This post is private');
      return res.redirect('/social/feed');
    }
    
    // If user is logged in, check if they liked the post
    let hasLiked = false;
    let characters = [];
    
    if (req.user) {
      const like = await Like.findOne({
        where: {
          userId: req.user.id,
          postId: post.id
        }
      });
      
      hasLiked = !!like;
      
      // Get user's characters for commenting
      characters = await Character.findAll({
        where: {
          userId: req.user.id,
          isArchived: false
        },
        attributes: ['id', 'name', 'avatarUrl']
      });
    }
    
    post.hasLiked = hasLiked;
    
    // Make the formatTimeAgo function available to the template
    res.locals.formatTimeAgo = formatTimeAgo;
    
    res.render('social/post', {
      title: 'View Post',
      post,
      characters
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    req.flash('error_msg', 'An error occurred while fetching the post');
    res.redirect('/social/feed');
  }
};

// Edit post form
exports.getEditPost = async (req, res) => {
  try {
    const post = await SocialPost.findByPk(req.params.id, {
      include: [
        {
          model: Character,
          attributes: ['id', 'name']
        }
      ]
    });
    
    if (!post) {
      req.flash('error_msg', 'Post not found');
      return res.redirect('/social/feed');
    }
    
    // Check if user is the creator
    if (post.userId !== req.user.id) {
      req.flash('error_msg', 'Not authorized to edit this post');
      return res.redirect('/social/feed');
    }
    
    // Get user's characters
    const characters = await Character.findAll({
      where: {
        userId: req.user.id,
        isArchived: false
      }
    });
    
    res.render('social/edit', {
      title: 'Edit Post',
      post,
      characters
    });
  } catch (error) {
    console.error('Error fetching post for edit:', error);
    req.flash('error_msg', 'An error occurred while loading the edit form');
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
    const { content, characterId, imageUrl, privacy } = req.body;
    
    // Find post
    const post = await SocialPost.findByPk(req.params.id);
    
    if (!post) {
      req.flash('error_msg', 'Post not found');
      return res.redirect('/social/feed');
    }
    
    // Check if user is the creator
    if (post.userId !== req.user.id) {
      req.flash('error_msg', 'Not authorized to edit this post');
      return res.redirect('/social/feed');
    }
    
    // Verify character belongs to user if provided
    if (characterId) {
      const character = await Character.findOne({
        where: {
          id: characterId,
          userId: req.user.id
        }
      });
      
      if (!character) {
        req.flash('error_msg', 'Invalid character selection');
        return res.redirect(`/social/post/${req.params.id}/edit`);
      }
    }
    
    // Update post - imageUrl is now optional
    await post.update({
      characterId: characterId || null,
      content,
      imageUrl: imageUrl && imageUrl.trim() !== '' ? imageUrl : null,
      privacy: privacy || 'public',
      isEdited: true
    });
    
    req.flash('success_msg', 'Post updated successfully');
    res.redirect(`/social/post/${post.id}`);
  } catch (error) {
    console.error('Error updating post:', error);
    req.flash('error_msg', 'An error occurred while updating your post');
    res.redirect(`/social/post/${req.params.id}/edit`);
  }
};

// Delete post
exports.deletePost = async (req, res) => {
  try {
    // Find post
    const post = await SocialPost.findByPk(req.params.id);
    
    if (!post) {
      req.flash('error_msg', 'Post not found');
      return res.redirect('/social/feed');
    }
    
    // Check if user is the creator
    if (post.userId !== req.user.id) {
      req.flash('error_msg', 'Not authorized to delete this post');
      return res.redirect('/social/feed');
    }
    
    // Delete post
    await post.destroy();
    
    req.flash('success_msg', 'Post deleted successfully');
    res.redirect('/social/feed');
  } catch (error) {
    console.error('Error deleting post:', error);
    req.flash('error_msg', 'An error occurred while deleting the post');
    res.redirect('/social/feed');
  }
};

// Like or unlike post
exports.likePost = async (req, res) => {
  try {
    const { action } = req.body;
    const postId = req.params.id;
    
    // Find post
    const post = await SocialPost.findByPk(postId);
    
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    
    // Check if user has already liked the post
    const existingLike = await Like.findOne({
      where: {
        userId: req.user.id,
        postId
      }
    });
    
    // Handle like/unlike based on action
    if (action === 'like' && !existingLike) {
      // Create like
      await Like.create({
        userId: req.user.id,
        postId
      });
      
      // Increment like count
      await post.increment('likeCount');
      await post.reload();
      
      return res.json({ success: true, count: post.likeCount });
    } else if (action === 'unlike' && existingLike) {
      // Remove like
      await existingLike.destroy();
      
      // Decrement like count
      await post.decrement('likeCount');
      await post.reload();
      
      return res.json({ success: true, count: post.likeCount });
    }
    
    // No change needed
    return res.json({ success: true, count: post.likeCount });
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
    const { content, commentAsId } = req.body;
    const postId = req.params.id;
    
    // Find post
    const post = await SocialPost.findByPk(postId);
    
    if (!post) {
      req.flash('error_msg', 'Post not found');
      return res.redirect('/social/feed');
    }
    
    // Verify character belongs to user if provided
    if (commentAsId) {
      const character = await Character.findOne({
        where: {
          id: commentAsId,
          userId: req.user.id
        }
      });
      
      if (!character) {
        req.flash('error_msg', 'Invalid character selection');
        return res.redirect(`/social/post/${postId}`);
      }
    }
    
    // Create comment
    await Comment.create({
      postId,
      userId: req.user.id,
      characterId: commentAsId || null,
      content
    });
    
    // Increment comment count
    await post.increment('commentCount');
    
    req.flash('success_msg', 'Comment added successfully');
    res.redirect(`/social/post/${postId}`);
  } catch (error) {
    console.error('Error adding comment:', error);
    req.flash('error_msg', 'An error occurred while adding your comment');
    res.redirect(`/social/post/${req.params.id}`);
  }
};

// Delete comment
exports.deleteComment = async (req, res) => {
  try {
    const commentId = req.params.id;
    
    // Find comment
    const comment = await Comment.findByPk(commentId);
    
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }
    
    // Check if user is the creator
    if (comment.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    
    // Get post to update comment count
    const post = await SocialPost.findByPk(comment.postId);
    
    // Delete comment
    await comment.destroy();
    
    // Decrement comment count if post exists
    if (post) {
      await post.decrement('commentCount');
    }
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return res.status(500).json({ success: false, message: 'An error occurred' });
  }
};