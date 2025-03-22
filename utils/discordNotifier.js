// utils/discordNotifier.js
const { WebhookClient } = require('discord.js');

// Store the webhook client instance
let webhookClient = null;

// Initialize the webhook client
const initialize = (webhookUrl) => {
  try {
    webhookClient = new WebhookClient({ url: webhookUrl });
    console.log('Discord webhook initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize Discord webhook:', error);
    return false;
  }
};

// Send a notification to Discord
const sendNotification = async (content, options = {}) => {
  if (!webhookClient) {
    console.error('Discord webhook not initialized');
    return false;
  }

  try {
    await webhookClient.send({
      content,
      username: options.username || '1x1 Roleplay Hub',
      avatarURL: options.avatarURL || 'https://your-site.com/logo.png',
      embeds: options.embeds || []
    });
    return true;
  } catch (error) {
    console.error('Failed to send Discord notification:', error);
    return false;
  }
};

module.exports = {
  initialize,
  sendNotification
};