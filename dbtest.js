require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD, 
  {
    host: '127.0.0.1',  // Use IPv4 instead of hostname
    dialect: 'mysql',
    dialectOptions: {
      connectTimeout: 60000
    }
  }
);
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('Database connection successful!');
  } catch (error) {
    console.error('Database connection failed:', error);
  }
}

testConnection();
