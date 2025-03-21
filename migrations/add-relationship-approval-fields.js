// Save this as migrations/add-relationship-approval-fields.js

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add the three new columns to the relationships table
    return Promise.all([
      queryInterface.addColumn(
        'relationships',
        'isPending',
        {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          allowNull: false
        }
      ),
      queryInterface.addColumn(
        'relationships',
        'isApproved',
        {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          allowNull: false
        }
      ),
      queryInterface.addColumn(
        'relationships',
        'requestedById',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          }
        }
      )
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the three columns if needed to rollback
    return Promise.all([
      queryInterface.removeColumn('relationships', 'isPending'),
      queryInterface.removeColumn('relationships', 'isApproved'),
      queryInterface.removeColumn('relationships', 'requestedById')
    ]);
  }
};