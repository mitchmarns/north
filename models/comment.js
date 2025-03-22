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