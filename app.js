require('dotenv').config();
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const flash = require('connect-flash');
const session = require('express-session');
const passport = require('passport');
const methodOverride = require('method-override');
const { sequelize, Character, Relationship, Sequelize } = require('./models');

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
    
    // Sync models with database
    // Set force: true to drop and recreate tables (use carefully in production)
    await sequelize.sync({ force: false });
    console.log('Database synced');
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

async function updateDatabaseSchema() {
  try {
    console.log('Starting database schema update...');
    
    // Check if the Team model exists
    const Team = require('./models').Team;
    
    // First, try to add the enum type and new columns to the characters table
    try {
      console.log('Adding new fields to characters table...');
      await sequelize.query(`
        ALTER TABLE characters 
        ADD COLUMN role ENUM('Player', 'Staff', 'Civilian') NOT NULL DEFAULT 'Civilian',
        ADD COLUMN teamId INT,
        ADD COLUMN position VARCHAR(50),
        ADD COLUMN jerseyNumber INT
      `);
      console.log('Successfully added new fields to characters table');
    } catch (error) {
      console.log('Note: Character table modification error (might already exist):', error.message);
    }
    
    // Force sync just the Team model
    console.log('Creating/updating teams table...');
    await Team.sync({ force: true });
    console.log('Teams table created/updated successfully');
    
    // Add foreign key relationship if it doesn't exist
    try {
      console.log('Adding foreign key constraint...');
      await sequelize.query(`
        ALTER TABLE characters 
        ADD CONSTRAINT characters_team_fk
        FOREIGN KEY (teamId) 
        REFERENCES teams(id)
        ON DELETE SET NULL
      `);
      console.log('Foreign key constraint added successfully');
    } catch (error) {
      console.log('Note: Foreign key constraint error (might already exist):', error.message);
    }
    
    console.log('Database schema update completed successfully!');
  } catch (error) {
    console.error('Error updating database schema:', error);
  }
}

// Call this function before startServer()
// REMOVE THIS LINE AFTER FIRST RUN
updateDatabaseSchema().then(() => startServer());

// startServer();
