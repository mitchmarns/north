module.exports = (sequelize, DataTypes) => {
  const Team = sequelize.define('Team', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true
      }
    },
    shortName: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    logo: {
      type: DataTypes.STRING,
      allowNull: true
    },
    primaryColor: {
      type: DataTypes.STRING(7),
      allowNull: true
    },
    secondaryColor: {
      type: DataTypes.STRING(7),
      allowNull: true
    },
    tertiaryColor: {
      type: DataTypes.STRING(7),
      allowNull: true
    },
    city: {
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
    foundedYear: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    timestamps: true,
    tableName: 'teams'
  });

  return Team;
};