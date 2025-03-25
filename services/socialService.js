// services/socialService.js
const discordNotifier = require('../utils/discordNotifier');
const { SocialPost, Comment, Like, Character, User, sequelize, Sequelize } = require('../models');
const Op = Sequelize.Op;

/**
 * Format time ago helper function
 * @param {Date} date - Date to format
 * @returns {string} Formatted time ago string
 */
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

/**
 * Get social feed with filters
 * @param {string} filter - Filter type (all, mine, following)
 * @param {string} sort - Sort type (recent, popular)
 * @param {number} page - Page number
 * @param {number|null} userId - User ID if logged in
 * @returns {Object} Posts and formatting data
 */
exports.getFeed = async (filter, sort, page, userId) => {
  filter = filter || 'all';
  sort = sort || 'recent';
  page = parseInt(page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;
  
  // Build query based on filter type
  let whereClause = {};
  
  if (filter === 'mine' && userId) {
    // Only show user's posts
    whereClause.userId = userId;
  } else if (filter === 'following' && userId) {
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
  
 // Format the posts
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

// If user is logged in, check if they liked each post
if (userId) {
  // Get all likes from the user for these posts
  const postIds = posts.map(post => post.id);
  const userLikes = await Like.findAll({
    where: {
      userId: userId,
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
  var characters = await Character.findAll({
    where: {
      userId: userId,
      isArchived: false
    },
    attributes: ['id', 'name', 'avatarUrl']
  });
} else {
  characters = [];
}

return {
  posts,
  characters,
  filter,
  sort,
  formatTimeAgo
};
};

/**
 * Load more posts (pagination)
 * @param {string} filter - Filter type (all, mine, following)
 * @param {string} sort - Sort type (recent, popular)
 * @param {number} page - Page number
 * @param {number|null} userId - User ID if logged in
 * @returns {Object} More posts
 */
exports.loadMorePosts = async (filter, sort, page, userId) => {
  filter = filter || 'all';
  sort = sort || 'recent';
  page = parseInt(page) || 2;
  const limit = 10;
  const offset = (page - 1) * limit;
  
  // Build where clause
  let whereClause = {};
  
  if (filter === 'mine' && userId) {
    whereClause.userId = userId;
  } else {
    whereClause.privacy = 'public';
  }
  
  // Build order
  let order = sort === 'popular' 
    ? [['likeCount', 'DESC'], ['createdAt', 'DESC']] 
    : [['createdAt', 'DESC']];
  
  // Single optimized query with selective includes
  const posts = await SocialPost.findAll({
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
  
  // Process user likes if logged in
  if (userId && posts.length > 0) {
    const postIds = posts.map(post => post.id);
    
    const userLikes = await Like.findAll({
      where: {
        userId: userId,
        postId: { [Sequelize.Op.in]: postIds }
      },
      attributes: ['postId']
    });
    
    const likedMap = {};
    userLikes.forEach(like => {
      likedMap[like.postId] = true;
    });
    
    posts.forEach(post => {
      post.dataValues.hasLiked = likedMap[post.id] || false;
    });
  }
  
  return { posts };
};

/**
* Get a single post with comments
* @param {number} postId - The post ID
* @param {number|null} userId - User ID if logged in
* @returns {Object} Post data with comments and other info
*/
exports.getPost = async (postId, userId) => {
const rawPost = await SocialPost.findByPk(postId, {
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
  throw new Error('Post not found');
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
if (post.privacy === 'private' && (!userId || post.userId !== userId)) {
  throw new Error('This post is private');
}

// If user is logged in, check if they liked the post
let hasLiked = false;
let characters = [];

if (userId) {
  const like = await Like.findOne({
    where: {
      userId: userId,
      postId: post.id
    }
  });
  
  hasLiked = !!like;
  
  // Get user's characters for commenting
  characters = await Character.findAll({
    where: {
      userId: userId,
      isArchived: false
    },
    attributes: ['id', 'name', 'avatarUrl']
  });
}

post.hasLiked = hasLiked;

return {
  post,
  characters,
  formatTimeAgo
};
};

/**
 * Get post for editing
 * @param {number} postId - The post ID
 * @param {number} userId - User ID
 * @returns {Object} Post data for editing
 */
exports.getPostForEdit = async (postId, userId) => {
  const post = await SocialPost.findByPk(postId, {
    include: [
      {
        model: Character,
        attributes: ['id', 'name']
      }
    ]
  });
  
  if (!post) {
    throw new Error('Post not found');
  }
  
  // Check if user is the creator
  if (post.userId !== userId) {
    throw new Error('Not authorized to edit this post');
  }
  
  // Get user's characters
  const characters = await Character.findAll({
    where: {
      userId: userId,
      isArchived: false
    }
  });
  
  return {
    post,
    characters
  };
};

/**
* Create a new social post
* @param {Object} postData - Post data
* @param {number} userId - User ID
* @returns {Object} The created post
*/
exports.createPost = async (postData, userId) => {
const { 
  content, characterId, privacy, postType, 
  imageCaption, 
  songTitle, artistName, albumName, albumCoverUrl, musicThoughts,
  mediaUrls
} = postData;

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

// Prepare post data based on type
let newPostData = {
  userId: userId,
  characterId: characterId || null,
  privacy: privacy || 'public',
  postType: postType || 'text',
  likeCount: 0,
  commentCount: 0
};

// Add content based on post type
switch (postType) {
  case 'text':
    // For text posts, content is required
    if (!content || content.trim() === '') {
      throw new Error('Post content is required');
    }
    
    newPostData.content = content;
    break;
    
  case 'image':
    // For image posts, at least one valid image URL is required
    newPostData.content = imageCaption || '';
    
    // Handle multiple images
    let imageUrls = [];
    
    // Check if mediaUrls exists in req.body
    if (mediaUrls) {
      if (Array.isArray(mediaUrls)) {
        // Filter out empty URLs
        imageUrls = mediaUrls.filter(url => url && url.trim() !== '');
      } else if (typeof mediaUrls === 'string' && mediaUrls.trim() !== '') {
        imageUrls = [mediaUrls.trim()];
      }
    }
    
    if (imageUrls.length === 0) {
      // Check if we received a single imageUrl from the old format
      if (postData.imageUrl && postData.imageUrl.trim() !== '') {
        imageUrls = [postData.imageUrl.trim()];
      } else {
        throw new Error('At least one image URL is required for image posts');
      }
    }
    newPostData.mediaUrls = imageUrls;
    break;
    
  case 'nowListening':
    // For music posts, song title and artist are required
    newPostData.content = musicThoughts && musicThoughts.trim() !== '' ? musicThoughts.trim() : '';
    
    if (!songTitle || songTitle.trim() === '') {
      throw new Error('Song title is required for music posts');
    }
    
    if (!artistName || artistName.trim() === '') {
      throw new Error('Artist name is required for music posts');
    }
    
    newPostData.songTitle = songTitle.trim();
    newPostData.artistName = artistName.trim();
    newPostData.albumName = albumName && albumName.trim() !== '' ? albumName.trim() : null;
    newPostData.albumCoverUrl = albumCoverUrl && albumCoverUrl.trim() !== '' ? albumCoverUrl.trim() : null;
    break;
    
  default:
    // Default to text post
    newPostData.content = content;
}

// Create post
const post = await SocialPost.create(newPostData);
return post;
};

/**
 * Update a social post
 * @param {number} postId - The post ID
 * @param {Object} postData - Updated post data
 * @param {number} userId - User ID
 * @returns {Object} The updated post
 */
exports.updatePost = async (postId, postData, userId) => {
  const { content, characterId, imageUrl, privacy } = postData;
  
  // Find post
  const post = await SocialPost.findByPk(postId);
  
  if (!post) {
    throw new Error('Post not found');
  }
  
  // Check if user is the creator
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
  
  // Update post data based on type
  const updateData = {
    characterId: characterId || null,
    content,
    privacy: privacy || 'public',
    isEdited: true
  };
  
  // For image posts, update the image URL if provided
  if (post.postType === 'image' && imageUrl) {
    updateData.imageUrl = imageUrl.trim() !== '' ? imageUrl : null;
  }
  
  // Update post
  await post.update(updateData);
  
  return post;
};

/**
 * Delete a social post
 * @param {number} postId - The post ID
 * @param {number} userId - User ID
 * @returns {boolean} Success status
 */
exports.deletePost = async (postId, userId) => {
  // Find post
  const post = await SocialPost.findByPk(postId);
  
  if (!post) {
    throw new Error('Post not found');
  }
  
  // Check if user is the creator
  if (post.userId !== userId) {
    throw new Error('Not authorized to delete this post');
  }
  
  // Delete associated comments and likes
  await Comment.destroy({
    where: { postId }
  });
  
  await Like.destroy({
    where: { postId }
  });
  
  // Delete post
  await post.destroy();
  
  return true;
};

/**
* Like or unlike a post
* @param {number} postId - The post ID
* @param {string} action - 'like' or 'unlike'
* @param {number} userId - User ID 
* @returns {Object} Updated like count
*/
exports.likePost = async (postId, action, userId) => {
// Find post
const post = await SocialPost.findByPk(postId);

if (!post) {
  throw new Error('Post not found');
}

// Check if user has already liked the post
const existingLike = await Like.findOne({
  where: {
    userId: userId,
    postId
  }
});

// Handle like/unlike based on action
if (action === 'like' && !existingLike) {
  // Create like
  await Like.create({
    userId: userId,
    postId
  });
  
  // Increment like count
  await post.increment('likeCount');
  await post.reload();
  
  return { count: post.likeCount };
} else if (action === 'unlike' && existingLike) {
  // Remove like
  await existingLike.destroy();
  
  // Decrement like count
  await post.decrement('likeCount');
  await post.reload();
  
  return { count: post.likeCount };
}

// No change needed
return { count: post.likeCount };
};

/**
 * Add a comment to a social post
 * @param {number} postId - The post ID
 * @param {Object} commentData - Comment data
 * @param {number} userId - User ID
 * @returns {Object} The created comment
 */
exports.addComment = async (postId, commentData, userId) => {
  // Find post
  const post = await SocialPost.findByPk(postId);
  
  if (!post) {
    throw new Error('Post not found');
  }
  
  // Extract comment data
  const { content, characterId } = commentData;
  
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
  
  // Create comment
  const comment = await Comment.create({
    postId,
    userId,
    characterId: characterId || null,
    content
  });
  
  // Increment comment count on post
  await post.increment('commentCount');
  
  return comment;
};

/**
 * Delete a comment
 * @param {number} commentId - The comment ID
 * @param {number} userId - User ID
 * @returns {boolean} Success status
 */
exports.deleteComment = async (commentId, userId) => {
  // Find comment
  const comment = await Comment.findByPk(commentId);
  
  if (!comment) {
    throw new Error('Comment not found');
  }
  
  // Check if user is the creator
  if (comment.userId !== userId) {
    throw new Error('Not authorized');
  }
  
  // Get post to update comment count
  const post = await SocialPost.findByPk(comment.postId);
  
  // Delete comment
  await comment.destroy();
  
  // Decrement comment count if post exists
  if (post) {
    await post.decrement('commentCount');
  }
  
  return true;
};

/**
 * Edit a comment
 * @param {number} commentId - The comment ID
 * @param {string} content - Updated comment content
 * @param {number} userId - User ID
 * @returns {Object} Updated comment
 */
exports.editComment = async (commentId, content, userId) => {
  // Find comment
  const comment = await Comment.findByPk(commentId);
  
  if (!comment) {
    throw new Error('Comment not found');
  }
  
  // Check if user is the creator
  if (comment.userId !== userId) {
    throw new Error('Not authorized');
  }
  
  // Update comment
  await comment.update({
    content,
    isEdited: true
  });
  
  return comment;
};