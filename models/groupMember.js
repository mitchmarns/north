// models/groupMember.js
module.exports = (sequelize, DataTypes) => {
  const GroupMember = sequelize.define('GroupMember', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    groupId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'group_conversations',
        key: 'id'
      }
    },
    characterId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'characters',
        key: 'id'
      }
    },
    isAdmin: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    joinedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    lastReadAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    timestamps: true,
    tableName: 'group_members',
    indexes: [
      {
        unique: true,
        fields: ['groupId', 'characterId']
      }
    ]
  });

  return GroupMember;
};