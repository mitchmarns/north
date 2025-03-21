const { Sequelize } = require('sequelize');
const env = process.env.NODE_ENV || 'development';
const config = require('../config/database')[env];

// Initialize Sequelize with MySQL database
let sequelize;
sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    ...config,
    dialect: 'mysql',
    dialectOptions: {
      socketPath: '/var/run/mysqld/mysqld.sock'
    }
  }
);

// Import models
const User = require('./user')(sequelize, Sequelize.DataTypes);
const Character = require('./character')(sequelize, Sequelize.DataTypes);
const Relationship = require('./relationship')(sequelize, Sequelize.DataTypes);
const Thread = require('./thread')(sequelize, Sequelize.DataTypes);
const Post = require('./post')(sequelize, Sequelize.DataTypes);

// Define model associations
User.hasMany(Character, { foreignKey: 'userId', as: 'characters' });
Character.belongsTo(User, { foreignKey: 'userId' });

Character.belongsToMany(Character, {
  through: Relationship,
  as: 'connections',
  foreignKey: 'character1Id',
  otherKey: 'character2Id'
});

Relationship.belongsTo(Character, { foreignKey: 'character1Id', as: 'character1' });
Relationship.belongsTo(Character, { foreignKey: 'character2Id', as: 'character2' });

User.hasMany(Thread, { foreignKey: 'creatorId', as: 'createdThreads' });
Thread.belongsTo(User, { foreignKey: 'creatorId', as: 'creator' });

Thread.hasMany(Post, { foreignKey: 'threadId', as: 'posts' });
Post.belongsTo(Thread, { foreignKey: 'threadId' });

Character.hasMany(Post, { foreignKey: 'characterId', as: 'posts' });
Post.belongsTo(Character, { foreignKey: 'characterId' });

User.hasMany(Post, { foreignKey: 'userId', as: 'posts' });
Post.belongsTo(User, { foreignKey: 'userId' });

// Export models and Sequelize instance
module.exports = {
  sequelize,
  Sequelize,
  User,
  Character,
  Relationship,
  Thread,
  Post
};
