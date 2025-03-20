const LocalStrategy = require('passport-local').Strategy;
const { User } = require('../models');

module.exports = function(passport) {
  passport.use(
    new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
      try {
        // Match user
        const user = await User.findOne({ where: { email } });
        
        if (!user) {
          return done(null, false, { message: 'Invalid email or password' });
        }
        
        // Match password
        const isMatch = await user.validPassword(password);
        
        if (isMatch) {
          // Update last login time
          await user.update({ lastLogin: new Date() });
          return done(null, user);
        } else {
          return done(null, false, { message: 'Invalid email or password' });
        }
      } catch (err) {
        console.error('Error in passport authentication:', err);
        return done(err);
      }
    })
  );
  
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findByPk(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};