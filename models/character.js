module.exports = (sequelize, DataTypes) => {
  const Character = sequelize.define('Character', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    nickname: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    age: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    gender: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    avatarUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    faceclaim: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    shortBio: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    fullBio: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    appearance: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    personality: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    background: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    skills: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    likes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    dislikes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    fears: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    goals: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    role: {
      type: DataTypes.ENUM('Player', 'Staff', 'Civilian'),
      allowNull: false,
      defaultValue: 'Civilian'
    },
    teamId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'teams',
        key: 'id'
      }
    },
    position: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    isPrivate: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isArchived: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    timestamps: true,
    tableName: 'characters'
  });

  return Character;
};