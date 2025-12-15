const guard = require('../../secure/guard');

function help(api, event) {
  const userId = event.senderID;
  
  let helpText = `🤖 BOT HELP MENU\n`;
  helpText += `Prefix: !\n\n`;
  
  // User commands
  helpText += `👤 USER COMMANDS:\n`;
  helpText += `• !help - Show this menu\n`;
  helpText += `• !info - Bot information\n`;
  helpText += `• !stats - Usage statistics\n\n`;
  
  if (guard.isAdmin(userId) || guard.isOwner(userId)) {
    helpText += `🛡️ ADMIN COMMANDS:\n`;
    helpText += `• !startfun [type] - Start fun (chor/murgi/abal/senior/cow/goat)\n`;
    helpText += `• !stopfun - Stop fun in this thread\n`;
    helpText += `• !editadminphoto [1-3] [url] - Edit admin photo\n`;
    helpText += `• !updatefun [type] [text] - Update fun JSON\n`;
    helpText += `• !managegroups [action] - Manage bot groups\n\n`;
  }
  
  if (guard.isOwner(userId)) {
    helpText += `👑 OWNER COMMANDS:\n`;
    helpText += `• !emergencystop - Force stop all fun\n`;
    helpText += `• !shutdown - Emergency bot shutdown\n`;
    helpText += `• !addadmin [uid] - Add new admin\n`;
    helpText += `• !removeadmin [uid] - Remove admin\n`;
  }
  
  api.sendMessage(helpText, event.threadID);
}

module.exports = help;