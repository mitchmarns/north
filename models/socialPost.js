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
      allowNull: true,
      defaultValue: null
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