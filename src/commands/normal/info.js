const guard = require('../../secure/guard');
const fs = require('fs');
const path = require('path');
const config = require('../../../config/config.json');

function info(api, event) {
  const userId = event.senderID;
  const packageJson = require('../../../package.json');
  
  let role = '👤 User';
  if (guard.isAdmin(userId)) role = '🛡️ Admin';
  if (guard.isOwner(userId)) role = '👑 Owner';
  
  const infoText = `
🤖 BOT INFORMATION

📦 Name: ${packageJson.name}
🔢 Version: ${packageJson.version}
📝 Description: ${packageJson.description}

⚙️ Configuration:
• Prefix: ${config.prefix}
• Fun Enabled: ${config.funEnabled ? 'Yes' : 'No'}
• Max Admin Photos: ${config.maxAdminPhotos}
• Delay Range: ${config.delayRange[0]}-${config.delayRange[1]}ms

👤 Your Role: ${role}
🧵 Thread ID: ${event.threadID}
👤 Your UID: ${userId}

🏗️ Developed with professional security layers
🔐 Owner-protected system
🚀 Fast and reliable performance
  `;
  
  api.sendMessage(infoText, event.threadID);
}

module.exports = info;