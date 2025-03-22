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

async function createSocialMediaTables() {
  try {
    console.log('Starting migration for social media tables...');
    
    // Run raw SQL queries using sequelize.query
    await sequelize.query(`
      -- Create social_posts table
      CREATE TABLE IF NOT EXISTS \`social_posts\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`userId\` INT NOT NULL,
        \`characterId\` INT NULL,
        \`content\` TEXT NOT NULL,
        \`imageUrl\` VARCHAR(255) NULL,
        \`privacy\` ENUM('public', 'private') NOT NULL DEFAULT 'public',
        \`likeCount\` INT NOT NULL DEFAULT 0,
        \`commentCount\` INT NOT NULL DEFAULT 0,
        \`isEdited\` TINYINT(1) NOT NULL DEFAULT 0,
        \`createdAt\` DATETIME NOT NULL,
        \`updatedAt\` DATETIME NOT NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`idx_userId\` (\`userId\`),
        INDEX \`idx_characterId\` (\`characterId\`),
        INDEX \`idx_privacy\` (\`privacy\`),
        INDEX \`idx_createdAt\` (\`createdAt\`),
        CONSTRAINT \`fk_social_posts_users\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_social_posts_characters\` FOREIGN KEY (\`characterId\`) REFERENCES \`characters\` (\`id\`) ON DELETE SET NULL
      );
    `);
    
    console.log('Created social_posts table');
    
    // Create comments table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS \`comments\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`postId\` INT NOT NULL,
        \`userId\` INT NOT NULL,
        \`characterId\` INT NULL,
        \`content\` TEXT NOT NULL,
        \`createdAt\` DATETIME NOT NULL,
        \`updatedAt\` DATETIME NOT NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`idx_postId\` (\`postId\`),
        INDEX \`idx_userId\` (\`userId\`),
        INDEX \`idx_characterId\` (\`characterId\`),
        CONSTRAINT \`fk_comments_social_posts\` FOREIGN KEY (\`postId\`) REFERENCES \`social_posts\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_comments_users\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_comments_characters\` FOREIGN KEY (\`characterId\`) REFERENCES \`characters\` (\`id\`) ON DELETE SET NULL
      );
    `);
    
    console.log('Created comments table');
    
    // Create likes table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS \`likes\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`postId\` INT NOT NULL,
        \`userId\` INT NOT NULL,
        \`createdAt\` DATETIME NOT NULL,
        \`updatedAt\` DATETIME NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`idx_post_user\` (\`postId\`, \`userId\`),
        CONSTRAINT \`fk_likes_social_posts\` FOREIGN KEY (\`postId\`) REFERENCES \`social_posts\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_likes_users\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      );
    `);
    
    console.log('Created likes table');
    console.log('Social media tables migration completed successfully!');
    
  } catch (error) {
    console.error('Error creating social media tables:', error);
  }
}

// Add this right before your startServer() function call
startServer().then(() => {
  createSocialMediaTables().then(() => {
    console.log('Migration check complete, remove the createSocialMediaTables function from app.js');
  });
});

startServer();