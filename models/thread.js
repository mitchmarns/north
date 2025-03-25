// models/thread.js
module.exports = (sequelize, DataTypes) => {
  const Thread = sequelize.define('Thread', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    creatorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    setting: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    tags: {
      type: DataTypes.STRING(255),
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('tags');
        return rawValue ? rawValue.split(',') : [];
      },
      set(val) {
        if (Array.isArray(val)) {
          this.setDataValue('tags', val.join(','));
        } else {
          this.setDataValue('tags', val);
        }
      }
    },
    featuredImage: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('Active', 'Paused', 'Completed', 'Abandoned'),
      defaultValue: 'Active'
    },
    isPrivate: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    lastPostAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    threadDate: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
   {
    timestamps: true,
    tableName: 'threads'
  });

  return Thread;
};