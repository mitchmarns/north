// models/groupConversation.js
module.exports = (sequelize, DataTypes) => {
  const GroupConversation = sequelize.define('GroupConversation', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    avatarUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    teamId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'teams',
        key: 'id'
      }
    },
    isGlobal: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    createdById: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    lastMessageAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    timestamps: true,
    tableName: 'group_conversations',
    indexes: [
      {
        fields: ['teamId']
      },
      {
        fields: ['isGlobal']
      },
      {
        fields: ['createdById']
      }
    ]
  });

  return GroupConversation;
};