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
    postType: {
      type: DataTypes.ENUM('text', 'image', 'nowListening', 'multiple_images'),
      defaultValue: 'text'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true, // Can be null for some post types
    },
    mediaUrls: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('mediaUrls');
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(val) {
        this.setDataValue('mediaUrls', JSON.stringify(val));
      }
    },
    // Music-related fields for "Now Listening" posts
    songTitle: {
      type: DataTypes.STRING,
      allowNull: true
    },
    artistName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    albumName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    albumCoverUrl: {
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
        fields: ['postType']
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
}