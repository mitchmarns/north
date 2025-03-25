// models/threadCharacters.js
module.exports = (sequelize, DataTypes) => {
  const ThreadCharacters = sequelize.define('ThreadCharacters', {
    threadId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'threads',
        key: 'id'
      }
    },
    characterId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'characters',
        key: 'id'
      }
    }
  }, {
    timestamps: true,
    tableName: 'thread_characters'
  });

  return ThreadCharacters;
};