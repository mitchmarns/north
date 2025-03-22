// routes/help.js
const express = require('express');
const router = express.Router();

// Text formatting help guide
router.get('/text-formatting', (req, res) => {
  res.render('help/text-formatting', {
    title: 'Text Formatting Guide'
  });
});