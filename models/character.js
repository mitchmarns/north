// Updated character.js model with additional fields
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
    
    // New Character Stats Fields
    strength: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      }
    },
    dexterity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      }
    },
    constitution: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      }
    },
    intelligence: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      }
    },
    wisdom: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      }
    },
    charisma: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      }
    },
    
    // Personality Type (e.g., MBTI, Enneagram, etc.)
    personalityType: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    
    // Occupation/Job
    occupation: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    
    // Playlist - Store as JSON array of song objects
    playlist: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('playlist');
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(val) {
        this.setDataValue('playlist', val ? JSON.stringify(val) : null);
      }
    },
    
    // For Team-related fields
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
    jerseyNumber: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 99
      }
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
    tableName: 'characters',
    indexes: [
      { fields: ['userId'] },
      { fields: ['teamId'] },
      { fields: ['isPrivate'] },
      { fields: ['isArchived'] },
      { fields: ['role'] },
      // Composite index for common queries
      { fields: ['userId', 'isArchived'] }
    ]
  });

  return Character;
};