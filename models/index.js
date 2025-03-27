// models/index.js
const { Sequelize } = require('sequelize');
const env = process.env.NODE_ENV || 'development';
const config = require('../config/database')[env];

// Initialize Sequelize with Oracle database
const sequelize = new Sequelize(
  process.env.DB_NAME,     // Database name
  process.env.DB_USER,     // Username
  process.env.DB_PASSWORD, // Password
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 1521,
    dialect: 'oracle',
    dialectModule: require('oracledb'),
    dialectOptions: {
      connectString: `${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
    },
    pool: {
      max: 15,
      min: 5,
      idle: 10000,   
      acquire: 30000, 
      evict: 30000  
    },
    logging: process.env.NODE_ENV === 'production' ? false : console.log,
    define: {
      // Use Oracle-compatible timestamps
      timestamps: true,
      underscored: true  // Use snake_case for automatically added attributes
    }
  }
);


// Import models
const User = require('./user')(sequelize, Sequelize.DataTypes);
const Character = require('./character')(sequelize, Sequelize.DataTypes);
const CharacterGallery = require('./characterGallery')(sequelize, Sequelize.DataTypes);
const Relationship = require('./relationship')(sequelize, Sequelize.DataTypes);
const Thread = require('./thread')(sequelize, Sequelize.DataTypes);
const Post = require('./post')(sequelize, Sequelize.DataTypes);
const Team = require('./team')(sequelize, Sequelize.DataTypes);
const Message = require('./messages')(sequelize, Sequelize.DataTypes);
const SocialPost = require('./socialPost')(sequelize, Sequelize.DataTypes);
const Comment = require('./comment')(sequelize, Sequelize.DataTypes);
const Like = require('./like')(sequelize, Sequelize.DataTypes);
const ThreadCharacters = require('./threadCharacters')(sequelize, Sequelize.DataTypes);
const RelationshipGallery = require('./relationshipGallery')(sequelize, Sequelize.DataTypes);
const RelationshipPlaylist = require('./relationshipPlaylist')(sequelize, Sequelize.DataTypes);

// Define model associations
User.hasMany(Character, { foreignKey: 'userId', as: 'characters' });
Character.belongsTo(User, { foreignKey: 'userId' });

// Character Gallery associations
Character.hasMany(CharacterGallery, { foreignKey: 'characterId', as: 'galleryImages' });
CharacterGallery.belongsTo(Character, { foreignKey: 'characterId' });

Character.belongsToMany(Character, {
  through: Relationship,
  as: 'connections',
  foreignKey: 'character1Id',
  otherKey: 'character2Id'
});

Relationship.belongsTo(Character, { foreignKey: 'character1Id', as: 'character1' });
Relationship.belongsTo(Character, { foreignKey: 'character2Id', as: 'character2' });
Relationship.belongsTo(User, { foreignKey: 'requestedById', as: 'requestedBy' });

User.hasMany(Thread, { foreignKey: 'creatorId', as: 'createdThreads' });
Thread.belongsTo(User, { foreignKey: 'creatorId', as: 'creator' });

Thread.hasMany(Post, { foreignKey: 'threadId', as: 'posts' });
Post.belongsTo(Thread, { foreignKey: 'threadId' });

Character.hasMany(Post, { foreignKey: 'characterId', as: 'posts' });
Post.belongsTo(Character, { foreignKey: 'characterId' });

User.hasMany(Post, { foreignKey: 'userId', as: 'posts' });
Post.belongsTo(User, { foreignKey: 'userId' });

Team.hasMany(Character, { foreignKey: 'teamId', as: 'members' });
Character.belongsTo(Team, { foreignKey: 'teamId' });

// Message associations
Character.hasMany(Message, { foreignKey: 'senderId', as: 'sentMessages' });
Message.belongsTo(Character, { foreignKey: 'senderId', as: 'sender' });

Character.hasMany(Message, { foreignKey: 'receiverId', as: 'receivedMessages' });
Message.belongsTo(Character, { foreignKey: 'receiverId', as: 'receiver' });

User.hasMany(SocialPost, { foreignKey: 'userId' });
SocialPost.belongsTo(User, { foreignKey: 'userId' });

Character.hasMany(SocialPost, { foreignKey: 'characterId' });
SocialPost.belongsTo(Character, { foreignKey: 'characterId' });

SocialPost.hasMany(Comment, { foreignKey: 'postId', as: 'comments' });
Comment.belongsTo(SocialPost, { foreignKey: 'postId' });

User.hasMany(Comment, { foreignKey: 'userId' });
Comment.belongsTo(User, { foreignKey: 'userId' });

Character.hasMany(Comment, { foreignKey: 'characterId' });
Comment.belongsTo(Character, { foreignKey: 'characterId' });

User.hasMany(Like, { foreignKey: 'userId' });
Like.belongsTo(User, { foreignKey: 'userId' });

SocialPost.hasMany(Like, { foreignKey: 'postId' });
Like.belongsTo(SocialPost, { foreignKey: 'postId' });

// Fix for the naming collision - change the association name from 'taggedCharacters' to 'threadTags'
Thread.belongsToMany(Character, {
  through: ThreadCharacters,
  foreignKey: 'threadId',
  otherKey: 'characterId',
  as: 'threadTags'  // Changed from 'taggedCharacters' to avoid naming collision
});

Character.belongsToMany(Thread, {
  through: ThreadCharacters,
  foreignKey: 'characterId',
  otherKey: 'threadId',
  as: 'taggedInThreads'
});

// Relationship Gallery associations
Relationship.hasMany(RelationshipGallery, { foreignKey: 'relationshipId', as: 'galleryImages' });
RelationshipGallery.belongsTo(Relationship, { foreignKey: 'relationshipId' });
User.hasMany(RelationshipGallery, { foreignKey: 'uploadedBy', as: 'uploadedGalleryImages' });
RelationshipGallery.belongsTo(User, { foreignKey: 'uploadedBy', as: 'uploader' });

// Relationship Playlist associations
Relationship.hasMany(RelationshipPlaylist, { foreignKey: 'relationshipId', as: 'playlistSongs' });
RelationshipPlaylist.belongsTo(Relationship, { foreignKey: 'relationshipId' });
User.hasMany(RelationshipPlaylist, { foreignKey: 'uploadedBy', as: 'uploadedPlaylistSongs' });
RelationshipPlaylist.belongsTo(User, { foreignKey: 'uploadedBy', as: 'uploader' });

// Export models and Sequelize instance
module.exports = {
  sequelize,
  Sequelize,
  User,
  Character,
  CharacterGallery,
  Relationship,
  Thread,
  Post,
  Team,
  Message,
  SocialPost,
  Comment,
  Like,
  ThreadCharacters,
  RelationshipGallery,
  RelationshipPlaylist
};