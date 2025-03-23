// models/message.js (updated version)
module.exports = (sequelize, DataTypes) => {
  const Message = sequelize.define('Message', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    senderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'characters',
        key: 'id'
      }
    },
    receiverId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'characters',
        key: 'id'
      }
    },
    groupId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'group_conversations',
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
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    // Optional image URL for image messages
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    timestamps: true,
    tableName: 'messages',
    indexes: [
      {
        fields: ['senderId', 'receiverId']
      },
      {
        fields: ['receiverId', 'isRead']
      },
      {
        fields: ['groupId']
      }
    ],
    validate: {
      eitherReceiverOrGroup() {
        if ((this.receiverId === null && this.groupId === null) || 
            (this.receiverId !== null && this.groupId !== null)) {
          throw new Error('A message must have either a receiver or a group, but not both');
        }
      }
    }
  });

  return Message;
};