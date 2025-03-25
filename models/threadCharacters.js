// models/threadCharacters.js
module.exports = (sequelize, DataTypes) => {
  const ThreadCharacters = sequelize.define('ThreadCharacters', {
    threadId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'threads',
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
    }
  }, {
    timestamps: false,
    tableName: 'thread_characters',
    indexes: [
      {
        unique: false,
        fields: ['threadId', 'characterId']
      }
    ]
  });

  return ThreadCharacters;
};