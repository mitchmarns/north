// models/relationshipGallery.js
module.exports = (sequelize, DataTypes) => {
  const RelationshipGallery = sequelize.define('RelationshipGallery', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    relationshipId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'relationships',
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
    uploadedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    timestamps: true,
    tableName: 'relationship_gallery',
    indexes: [
      {
        fields: ['relationshipId']
      },
      {
        fields: ['uploadedBy']
      }
    ]
  });

  return RelationshipGallery;
};