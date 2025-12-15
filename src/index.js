const fs = require('fs');
const path = require('path');
const guard = require('./secure/guard');
const { getPhotoForUser } = require('./utils/photo');

// Load config
const config = require('../config/config.json');

// Command loader
const commands = {};
const commandFolders = ['normal', 'admin', 'fun'];

commandFolders.forEach(folder => {
  const folderPath = path.join(__dirname, 'commands', folder);
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach(file => {
      if (file.endsWith('.js')) {
        const commandName = file.replace('.js', '');
        commands[commandName] = require(path.join(folderPath, file));
      }
    });
  }
});

// Messenger bot event handler
module.exports = function(api, event, args) {
  const userId = event.senderID;
  const message = event.body.trim();
  const prefix = config.prefix;

  if (!message.startsWith(prefix)) return;

  const cmd = message.slice(prefix.length).split(' ')[0].toLowerCase();
  const commandArgs = message.split(' ').slice(1);

  if (commands[cmd]) {
    try {
      // Photo logic
      const photo = getPhotoForUser(userId);
      if (photo) {
        // Send with photo if available
        api.sendMessage({ body: `Executing ${cmd}...`, attachment: photo }, event.threadID);
      }

      // Execute command
      commands[cmd](api, event, commandArgs);
    } catch (error) {
      console.error(`Command ${cmd} error:`, error);
      api.sendMessage(`Error: ${error.message}`, event.threadID);
    }
  }
};