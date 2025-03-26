// models/relationshipPlaylist.js
module.exports = (sequelize, DataTypes) => {
  const RelationshipPlaylist = sequelize.define('RelationshipPlaylist', {
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
    songTitle: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    artistName: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    albumName: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    albumCoverUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isUrl: true
      }
    },
    songUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isUrl: true
      }
    },
    description: {
      type: DataTypes.TEXT,
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
    tableName: 'relationship_playlist',
    indexes: [
      {
        fields: ['relationshipId']
      },
      {
        fields: ['uploadedBy']
      }
    ]
  });

  return RelationshipPlaylist;
};