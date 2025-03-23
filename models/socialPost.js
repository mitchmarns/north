// Modified socialPost.js model
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
      allowNull: false,
      defaultValue: ''
    },
    mediaUrls: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('mediaUrls');
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(val) {
        if (val === null) {
          this.setDataValue('mediaUrls', null);
        } else {
          this.setDataValue('mediaUrls', JSON.stringify(val));
        }
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
    ],
    // Add model hooks for validation and preprocessing
    hooks: {
      beforeValidate: (post, options) => {
        // Make sure nowListening posts have required fields
        if (post.postType === 'nowListening') {
          if (!post.songTitle || !post.artistName) {
            throw new Error('Song title and artist name are required for music posts');
          }
        }
        
        // Trim string values
        if (post.songTitle) post.songTitle = post.songTitle.trim();
        if (post.artistName) post.artistName = post.artistName.trim();
        if (post.albumName) post.albumName = post.albumName.trim();
      }
    }
  });

  return SocialPost;
}