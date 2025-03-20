const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    const connection = await mysql.createConnection({
      user: 'roleplay_user',
      password: process.env.DB_PASSWORD,
      database: 'roleplay_site',
      socketPath: '/var/run/mysqld/mysqld.sock'
    });
    
    console.log('Connected to database successfully!');
    connection.end();
  } catch (error) {
    console.error('Connection failed:', error);
  }
}

testConnection();
