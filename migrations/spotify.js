// migrations/YYYYMMDDHHMMSS-add-post-types.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('social_posts', 'postType', {
      type: Sequelize.ENUM('text', 'image', 'nowListening', 'multiple_images'),
      defaultValue: 'text',
      after: 'characterId'
    });
    
    await queryInterface.addColumn('social_posts', 'mediaUrls', {
      type: Sequelize.TEXT,
      allowNull: true,
      after: 'imageUrl'
    });
    
    await queryInterface.addColumn('social_posts', 'songTitle', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'mediaUrls'
    });
    
    await queryInterface.addColumn('social_posts', 'artistName', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'songTitle'
    });
    
    await queryInterface.addColumn('social_posts', 'albumName', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'artistName'
    });
    
    await queryInterface.addColumn('social_posts', 'albumCoverUrl', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'albumName'
    });
    
    // Update existing posts to have the 'text' type
    await queryInterface.sequelize.query(`
      UPDATE social_posts SET postType = 'text' WHERE postType IS NULL
    `);
    
    // Update existing posts with imageUrl to have 'image' type and migrate the URL to mediaUrls
    await queryInterface.sequelize.query(`
      UPDATE social_posts 
      SET postType = 'image',
          mediaUrls = JSON_ARRAY(imageUrl)
      WHERE imageUrl IS NOT NULL AND imageUrl != ''
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('social_posts', 'albumCoverUrl');
    await queryInterface.removeColumn('social_posts', 'albumName');
    await queryInterface.removeColumn('social_posts', 'artistName');
    await queryInterface.removeColumn('social_posts', 'songTitle');
    await queryInterface.removeColumn('social_posts', 'mediaUrls');
    await queryInterface.removeColumn('social_posts', 'postType');
  }
};