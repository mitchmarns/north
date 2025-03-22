// models/SocialPost.js
module.exports = (sequelize, DataTypes) => {
  const SocialPost = sequelize.define('SocialPost', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    characterId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'characters',
        key: 'id'
      }
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    privacy: {
      type: DataTypes.ENUM('public', 'private'),
      defaultValue: 'public'
    },
    likeCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    commentCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    isEdited: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    timestamps: true,
    tableName: 'social_posts',
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['characterId']
      },
      {
        fields: ['privacy']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  return SocialPost;
};

// models/Comment.js
module.exports = (sequelize, DataTypes) => {
  const Comment = sequelize.define('Comment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    postId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'social_posts',
        key: 'id'
      }
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    characterId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'characters',
        key: 'id'
      }
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    }
  }, {
    timestamps: true,
    tableName: 'comments',
    indexes: [
      {
        fields: ['postId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['characterId']
      }
    ]
  });

  return Comment;
};

// models/Like.js
module.exports = (sequelize, DataTypes) => {
  const Like = sequelize.define('Like', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    postId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'social_posts',
        key: 'id'
      }
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    timestamps: true,
    tableName: 'likes',
    indexes: [
      {
        unique: true,
        fields: ['postId', 'userId']
      }
    ]
  });

  return Like;
};

// Add to models/index.js
// After defining your existing models, add these new associations:

// Import new models
const SocialPost = require('./socialPost')(sequelize, Sequelize.DataTypes);
const Comment = require('./Comment')(sequelize, Sequelize.DataTypes);
const Like = require('./Like')(sequelize, Sequelize.DataTypes);

// Define relationships
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

// Export the new models
module.exports = {
  // ... existing exports
  SocialPost,
  Comment,
  Like
};