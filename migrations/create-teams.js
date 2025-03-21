// migrations/YYYY-MM-DD-create-teams.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('teams', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      shortName: {
        type: Sequelize.STRING(10),
        allowNull: false
      },
      logo: {
        type: Sequelize.STRING,
        allowNull: true
      },
      primaryColor: {
        type: Sequelize.STRING(7),
        allowNull: true
      },
      secondaryColor: {
        type: Sequelize.STRING(7),
        allowNull: true
      },
      tertiaryColor: {
        type: Sequelize.STRING(7),
        allowNull: true
      },
      city: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      foundedYear: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Also create a migration to alter the characters table
    await queryInterface.addColumn('characters', 'role', {
      type: Sequelize.ENUM('Player', 'Staff', 'Civilian'),
      defaultValue: 'Civilian',
      allowNull: false
    });
    
    await queryInterface.addColumn('characters', 'teamId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'teams',
        key: 'id'
      }
    });
    
    await queryInterface.addColumn('characters', 'position', {
      type: Sequelize.STRING(50),
      allowNull: true
    });
    
    await queryInterface.addColumn('characters', 'jerseyNumber', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('characters', 'jerseyNumber');
    await queryInterface.removeColumn('characters', 'position');
    await queryInterface.removeColumn('characters', 'teamId');
    await queryInterface.removeColumn('characters', 'role');
    await queryInterface.dropTable('teams');
  }
};