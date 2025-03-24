module.exports = (sequelize, DataTypes) => {
  const Post = sequelize.define('Post', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    threadId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'threads',
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
      type: DataTypes.TEXT('long'),
      allowNull: false
    },
    isEdited: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    lastEditedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    wordCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    timestamps: true,
    tableName: 'posts',
    indexes: [
      { fields: ['threadId'] },
      { fields: ['userId'] },
      { fields: ['characterId'] },
      { fields: ['createdAt'] },
      // For sorting and filtering
      { fields: ['threadId', 'createdAt'] }
    ],
    hooks: {
      beforeCreate: (post) => {
        // Count words in content
        if (post.content) {
          post.wordCount = post.content.split(/\s+/).filter(Boolean).length;
        }
      },
      beforeUpdate: (post) => {
        // Update word count and edited status
        if (post.changed('content')) {
          post.wordCount = post.content.split(/\s+/).filter(Boolean).length;
          post.isEdited = true;
          post.lastEditedAt = new Date();
        }
      }
    }
  });

  return Post;
};