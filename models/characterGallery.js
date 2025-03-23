// models/characterGallery.js
module.exports = (sequelize, DataTypes) => {
  const CharacterGallery = sequelize.define('CharacterGallery', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    characterId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'characters',
        key: 'id'
      }
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isUrl: true
      }
    },
    caption: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    timestamps: true,
    tableName: 'character_gallery',
    indexes: [
      {
        fields: ['characterId']
      }
    ]
  });

  return CharacterGallery;
};