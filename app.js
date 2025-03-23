require('dotenv').config();
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const flash = require('connect-flash');
const session = require('express-session');
const passport = require('passport');
const methodOverride = require('method-override');
const { sequelize, Character, Relationship, Message, Sequelize } = require('./models');
const discordNotifier = require('./utils/discordNotifier');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// Passport Config
require('./config/passport')(passport);

// EJS
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/main');

// Body Parser
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Method Override
app.use(methodOverride('_method'));

// Static Files
app.use(express.static(path.join(__dirname, 'public')));

// Express Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false
}));

// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect Flash
app.use(flash());

// Middleware to check for pending relationship requests
app.use(async (req, res, next) => {
  if (req.user) {
    try {
      const { Character, Relationship, Sequelize } = require('./models');
      
      // Get all characters owned by the user
      const userCharacters = await Character.findAll({
        where: {
          userId: req.user.id
        }
      });
      
      // Get IDs of all user's characters
      const characterIds = userCharacters.map(char => char.id);
      
      // Count pending relationships involving user's characters
      const pendingCount = await Relationship.count({
        where: {
          [Sequelize.Op.or]: [
            {
              character1Id: { [Sequelize.Op.in]: characterIds },
              isPending: true,
              requestedById: { [Sequelize.Op.ne]: req.user.id }
            },
            {
              character2Id: { [Sequelize.Op.in]: characterIds },
              isPending: true,
              requestedById: { [Sequelize.Op.ne]: req.user.id }
            }
          ]
        }
      });
      
      // Add pendingRequests count to res.locals
      res.locals.pendingRequests = pendingCount;
    } catch (error) {
      console.error('Error checking for pending requests:', error.message);
      console.error(error.stack);
      res.locals.pendingRequests = 0;
    }
  }
  next();
});

app.use(async (req, res, next) => {
  if (req.user) {
    try {
      const { Character, Message, Sequelize } = require('./models');
      
      // Get all characters owned by the user
      const userCharacters = await Character.findAll({
        where: {
          userId: req.user.id
        }
      });
      
      // Get IDs of all user's characters
      const characterIds = userCharacters.map(char => char.id);
      
      // Count unread messages for all user's characters
      const unreadCount = await Message.count({
        where: {
          receiverId: { [Sequelize.Op.in]: characterIds },
          isRead: false,
          isDeleted: false
        }
      });
      
      // Add unreadMessages count to res.locals
      res.locals.unreadMessages = unreadCount;
    } catch (error) {
      console.error('Error checking for unread messages:', error.message);
      console.error(error.stack);
      res.locals.unreadMessages = 0;
    }
  } else {
    res.locals.unreadMessages = 0;
  }
  next();
});

// Global Variables
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.user || null;
  next();
});

// Routes
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/characters', require('./routes/characters'));
app.use('/writing', require('./routes/writing'));
app.use('/teams', require('./routes/teams'));
app.use('/messages', require('./routes/messages'));
app.use('/help', require('./routes/help'));
app.use('/social', require('./routes/social'));

// Utility function to format text content with styling tags 
const formatTextContent = (text) => {
  if (!text) return '';
  // Process headings
  text = text.replace(/\[h1\](.*?)\[\/h1\]/g, '<h1>$1</h1>');
  text = text.replace(/\[h2\](.*?)\[\/h2\]/g, '<h2>$1</h2>');
  text = text.replace(/\[h3\](.*?)\[\/h3\]/g, '<h3>$1</h3>');
  // Process text formatting
  text = text.replace(/\[b\](.*?)\[\/b\]/g, '<span class="bold">$1</span>');
  text = text.replace(/\[i\](.*?)\[\/i\]/g, '<span class="italic">$1</span>');
  text = text.replace(/\[u\](.*?)\[\/u\]/g, '<span class="underline">$1</span>');
  text = text.replace(/\[s\](.*?)\[\/s\]/g, '<span class="strikethrough">$1</span>');
  // Process alignment
  text = text.replace(/\[center\](.*?)\[\/center\]/g, '<div class="text-center">$1</div>');
  text = text.replace(/\[right\](.*?)\[\/right\]/g, '<div class="text-right">$1</div>');
  text = text.replace(/\[left\](.*?)\[\/left\]/g, '<div class="text-left">$1</div>');
  // Process colors
  text = text.replace(/\[color-primary\](.*?)\[\/color-primary\]/g, '<span class="color-primary">$1</span>');
  text = text.replace(/\[color-success\](.*?)\[\/color-success\]/g, '<span class="color-success">$1</span>');
  text = text.replace(/\[color-danger\](.*?)\[\/color-danger\]/g, '<span class="color-danger">$1</span>');
  text = text.replace(/\[color-warning\](.*?)\[\/color-warning\]/g, '<span class="color-warning">$1</span>');
  // Process gradient text
  text = text.replace(/\[gradient\](.*?)\[\/gradient\]/g, '<span class="gradient-text">$1</span>');
  // Process quote
  text = text.replace(/\[quote\](.*?)\[\/quote\]/g, '<div class="quote">$1</div>');
  // Process divider
  text = text.replace(/\[divider\]/g, '<div class="divider"></div>');
  // Convert newlines to <br>
  text = text.replace(/\n/g, '<br>');
  return text;
};

// Add this to your Express.js app locals
app.locals.formatTextContent = formatTextContent;

// Helper function for time ago formatting
app.locals.formatTimeAgo = (date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now - new Date(date)) / 1000);
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds} second${diffInSeconds !== 1 ? 's' : ''} ago`;
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
  }
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks !== 1 ? 's' : ''} ago`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths !== 1 ? 's' : ''} ago`;
  }
  
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} year${diffInYears !== 1 ? 's' : ''} ago`;
};

// Error handling
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found' });
});

// Database Connection & Server Start
async function startServer() {
  try {
    // Force correct configuration for database connection
    sequelize.options.dialectOptions = {
      socketPath: '/var/run/mysqld/mysqld.sock'
    };
    
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Set force: true to drop and recreate tables (use carefully in production)
    await sequelize.sync({ force: false });
    console.log('Database synced');
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }

  if (process.env.DISCORD_WEBHOOK_URL) {
    discordNotifier.initialize(process.env.DISCORD_WEBHOOK_URL);
  }
}

// Add this to your app.js file to fix the issues

async function fixCharacterFunctionality() {
  try {
    console.log("Starting fix for character gallery and playlist features...");
    
    // 1. First, add the missing functions to characterController.js
    const fs = require('fs');
    const path = require('path');
    const controllerPath = path.join(__dirname, 'controllers', 'characterController.js');
    
    if (!fs.existsSync(controllerPath)) {
      console.error("❌ characterController.js not found at path:", controllerPath);
      return;
    }
    
    let controllerContent = fs.readFileSync(controllerPath, 'utf8');
    
    // Check for missing playlist methods
    if (!controllerContent.includes('exports.getCharacterPlaylist')) {
      console.log("Adding missing playlist methods to characterController.js");
      
      // Add playlist stub methods to controller
      const playlistMethods = `
// Stub methods for character playlist functionality
exports.getCharacterPlaylist = async (req, res) => {
  try {
    const characterId = req.params.id;
    
    // Find character
    const character = await Character.findByPk(characterId, {
      include: [
        {
          model: User,
          attributes: ['username', 'id']
        }
      ]
    });
    
    if (!character) {
      req.flash('error_msg', 'Character not found');
      return res.redirect('/characters');
    }
    
    // Check if character is private and user is not the owner
    if (character.isPrivate && (!req.user || req.user.id !== character.userId)) {
      req.flash('error_msg', 'This character is private');
      return res.redirect('/characters');
    }
    
    // For now, render a simple message that the feature is coming soon
    res.render('characters/playlist-stub', {
      title: \`\${character.name}'s Playlist\`,
      character,
      isOwner: req.user && req.user.id === character.userId
    });
  } catch (error) {
    console.error('Error fetching character playlist:', error);
    req.flash('error_msg', 'An error occurred while fetching the playlist');
    res.redirect(\`/characters/\${req.params.id}\`);
  }
};

// Stub method for adding songs
exports.addSongToPlaylist = async (req, res) => {
  req.flash('info_msg', 'Playlist functionality coming soon!');
  res.redirect(\`/characters/\${req.params.id}\`);
};

// Stub method for removing songs
exports.removeSongFromPlaylist = async (req, res) => {
  req.flash('info_msg', 'Playlist functionality coming soon!');
  res.redirect(\`/characters/\${req.params.id}\`);
};`;
      
      // Append the methods to the end of the controller file
      controllerContent += playlistMethods;
    }
    
    // Check for missing gallery methods
    if (!controllerContent.includes('exports.getCharacterGallery')) {
      console.log("Adding missing gallery methods to characterController.js");
      
      // Add gallery stub methods to controller
      const galleryMethods = `
// Stub methods for character gallery functionality
exports.getCharacterGallery = async (req, res) => {
  try {
    const characterId = req.params.id;
    
    // Find character
    const character = await Character.findByPk(characterId, {
      include: [
        {
          model: User,
          attributes: ['username', 'id']
        }
      ]
    });
    
    if (!character) {
      req.flash('error_msg', 'Character not found');
      return res.redirect('/characters');
    }
    
    // Check if character is private and user is not the owner
    if (character.isPrivate && (!req.user || req.user.id !== character.userId)) {
      req.flash('error_msg', 'This character is private');
      return res.redirect('/characters');
    }
    
    // For now, render a simple message that the feature is coming soon
    res.render('characters/gallery-stub', {
      title: \`\${character.name}'s Gallery\`,
      character,
      galleryImages: [],
      isOwner: req.user && req.user.id === character.userId
    });
  } catch (error) {
    console.error('Error fetching character gallery:', error);
    req.flash('error_msg', 'An error occurred while fetching the gallery');
    res.redirect(\`/characters/\${req.params.id}\`);
  }
};

exports.getUploadGalleryImage = async (req, res) => {
  try {
    const characterId = req.params.id;
    
    // Find character
    const character = await Character.findByPk(characterId);
    
    if (!character) {
      req.flash('error_msg', 'Character not found');
      return res.redirect('/characters');
    }
    
    // Check if user owns the character
    if (character.userId !== req.user.id) {
      req.flash('error_msg', 'Not authorized');
      return res.redirect(\`/characters/\${characterId}\`);
    }
    
    // For now, redirect back with message
    req.flash('info_msg', 'Gallery functionality coming soon!');
    res.redirect(\`/characters/\${characterId}\`);
  } catch (error) {
    console.error('Error loading upload form:', error);
    req.flash('error_msg', 'An error occurred while loading the upload form');
    res.redirect(\`/characters/\${req.params.id}\`);
  }
};

exports.uploadGalleryImage = async (req, res) => {
  req.flash('info_msg', 'Gallery functionality coming soon!');
  res.redirect(\`/characters/\${req.params.id}\`);
};

exports.deleteGalleryImage = async (req, res) => {
  req.flash('info_msg', 'Gallery functionality coming soon!');
  res.redirect(\`/characters/\${req.params.id}\`);
};

exports.updateGalleryOrder = async (req, res) => {
  return res.json({ success: true, message: 'Feature coming soon' });
};`;
      
      // Append the methods to the end of the controller file
      controllerContent += galleryMethods;
    }
    
    // Make sure CharacterGallery is imported properly
    if (!controllerContent.includes('CharacterGallery')) {
      // Find the import line for models
      const importRegex = /const\s*\{([^}]*)\}\s*=\s*require\(['"]\.\.\/models['"]\)/;
      const importMatch = controllerContent.match(importRegex);
      
      if (importMatch) {
        // Add CharacterGallery to the imports
        const newImports = importMatch[1] + ', CharacterGallery';
        const newImportLine = `const {${newImports}} = require('../models')`;
        controllerContent = controllerContent.replace(importRegex, newImportLine);
        console.log("✅ Fixed model imports in CharacterController.js");
      } else {
        console.error("❌ Could not find the import line in CharacterController.js");
      }
    }
    
    // Write the updated content back to the file
    fs.writeFileSync(controllerPath, controllerContent);
    console.log("✅ CharacterController.js has been updated");
    
    // 2. Create stub view files for gallery and playlist
    const viewsPath = path.join(__dirname, 'views', 'characters');
    
    if (!fs.existsSync(viewsPath)) {
      fs.mkdirSync(viewsPath, { recursive: true });
    }
    
    // Create gallery stub view
    const galleryStubPath = path.join(viewsPath, 'gallery-stub.ejs');
    const galleryStubContent = `<!-- views/characters/gallery-stub.ejs -->
<div class="d-flex justify-between align-center mb-4">
  <h1><%= character.name %>'s Gallery</h1>
  <a href="/characters/<%= character.id %>" class="btn btn-outline">
    <i class="ph-arrow-left-duotone"></i> Back to Character
  </a>
</div>

<div class="card">
  <div class="card-body">
    <div class="text-center p-5">
      <i class="ph-images-duotone" style="font-size: 4rem; color: #999; margin-bottom: 20px;"></i>
      <h3>Coming Soon!</h3>
      <p class="mt-3 mb-4">The character gallery feature is currently under development and will be available soon.</p>
      <a href="/characters/<%= character.id %>" class="btn">Return to Character</a>
    </div>
  </div>
</div>`;
    
    if (!fs.existsSync(galleryStubPath)) {
      fs.writeFileSync(galleryStubPath, galleryStubContent);
      console.log("✅ Created gallery stub view");
    }
    
    // Create playlist stub view
    const playlistStubPath = path.join(viewsPath, 'playlist-stub.ejs');
    const playlistStubContent = `<!-- views/characters/playlist-stub.ejs -->
<div class="d-flex justify-between align-center mb-4">
  <h1><%= character.name %>'s Playlist</h1>
  <a href="/characters/<%= character.id %>" class="btn btn-outline">
    <i class="ph-arrow-left-duotone"></i> Back to Character
  </a>
</div>

<div class="card">
  <div class="card-body">
    <div class="text-center p-5">
      <i class="ph-music-notes-duotone" style="font-size: 4rem; color: #999; margin-bottom: 20px;"></i>
      <h3>Coming Soon!</h3>
      <p class="mt-3 mb-4">The character playlist feature is currently under development and will be available soon.</p>
      <a href="/characters/<%= character.id %>" class="btn">Return to Character</a>
    </div>
  </div>
</div>`;
    
    if (!fs.existsSync(playlistStubPath)) {
      fs.writeFileSync(playlistStubPath, playlistStubContent);
      console.log("✅ Created playlist stub view");
    }
    
    // 3. Check routes.js to make sure routes are defined properly
    const routesPath = path.join(__dirname, 'routes', 'characters.js');
    
    if (fs.existsSync(routesPath)) {
      let routesContent = fs.readFileSync(routesPath, 'utf8');
      
      // Make sure the "view character" route is last
      if (routesContent.includes('router.get(\'/:id\', characterController.getCharacter);')) {
        // Move this line to the end of the file
        routesContent = routesContent.replace(/router\.get\('\/\:id', characterController\.getCharacter\);/g, '');
        routesContent += '\n// View character - This must be the last route because it uses a catch-all parameter\nrouter.get(\'/:id\', characterController.getCharacter);';
        
        fs.writeFileSync(routesPath, routesContent);
        console.log("✅ Fixed route order in characters.js");
      }
    }
    
    console.log("✅ Character fixes setup completed!");
    console.log("✅ You can now remove this function from app.js");
    
  } catch (error) {
    console.error("❌ Error in fix process:", error);
  }
}

// Call the fix function - REMOVE AFTER RUNNING ONCE SUCCESSFULLY
fixCharacterFunctionality().then(() => {
  console.log("Fix function complete - you can safely remove it from app.js now");
}).catch(err => {
  console.error("Fix function failed:", err);
});

 startServer();