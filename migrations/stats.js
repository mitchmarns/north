// Create a new migration file, e.g., add-character-stats.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('characters', 'strength', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    await queryInterface.addColumn('characters', 'dexterity', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    await queryInterface.addColumn('characters', 'constitution', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    await queryInterface.addColumn('characters', 'intelligence', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    await queryInterface.addColumn('characters', 'wisdom', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    await queryInterface.addColumn('characters', 'charisma', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    await queryInterface.addColumn('characters', 'personalityType', {
      type: Sequelize.STRING(20),
      allowNull: true
    });
    await queryInterface.addColumn('characters', 'occupation', {
      type: Sequelize.STRING(100),
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('characters', 'strength');
    await queryInterface.removeColumn('characters', 'dexterity');
    await queryInterface.removeColumn('characters', 'constitution');
    await queryInterface.removeColumn('characters', 'intelligence');
    await queryInterface.removeColumn('characters', 'wisdom');
    await queryInterface.removeColumn('characters', 'charisma');
    await queryInterface.removeColumn('characters', 'personalityType');
    await queryInterface.removeColumn('characters', 'occupation');
  }
};