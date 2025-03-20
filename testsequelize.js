const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('roleplay_site', 'roleplay_user', process.env.DB_PASSWORD, {
  dialect: 'mysql',
  dialectOptions: {
    socketPath: '/var/run/mysqld/mysqld.sock'
  }
});

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('Connection to database has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  } finally {
    await sequelize.close();
  }
}

testConnection();
