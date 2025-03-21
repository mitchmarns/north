module.exports = (sequelize, DataTypes) => {
  const Relationship = sequelize.define('Relationship', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    character1Id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'characters',
        key: 'id'
      }
    },
    character2Id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'characters',
        key: 'id'
      }
    },
    relationshipType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'Acquaintance'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('Positive', 'Neutral', 'Negative', 'Complicated'),
      defaultValue: 'Neutral'
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    isPending: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isApproved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    requestedById: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    timestamps: true,
    tableName: 'relationships',
    indexes: [
      {
        unique: true,
        fields: ['character1Id', 'character2Id']
      }
    ]
  });

  return Relationship;
};