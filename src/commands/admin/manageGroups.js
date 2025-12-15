const guard = require('../../secure/guard');

async function manageGroups(api, event, args) {
  const userId = event.senderID;
  guard.requireAdmin(userId);
  
  const action = args[0]?.toLowerCase();
  
  if (!action) {
    api.sendMessage('Usage: !managegroups [list|leave|info]', event.threadID);
    return;
  }
  
  try {
    switch (action) {
      case 'list':
        const threadList = await api.getThreadList(100, null, []);
        let listText = '📋 ACTIVE THREADS/GROUPS:\n\n';
        
        threadList.slice(0, 20).forEach((thread, index) => {
          listText += `${index + 1}. ${thread.name || 'Unnamed'}\n`;
          listText += `   👥 ${thread.participantIDs.length} members\n`;
          listText += `   🆔 ${thread.threadID}\n\n`;
        });
        
        api.sendMessage(listText, event.threadID);
        break;
        
      case 'leave':
        const targetThread = args[1];
        if (!targetThread) {
          api.sendMessage('Usage: !managegroups leave [threadID]', event.threadID);
          return;
        }
        
        await api.removeUserFromGroup(api.getCurrentUserID(), targetThread);
        api.sendMessage(`✅ Left thread: ${targetThread}`, event.threadID);
        break;
        
      case 'info':
        const threadInfo = await api.getThreadInfo(event.threadID);
        const infoText = `
📊 THREAD INFORMATION:

Name: ${threadInfo.name || 'Unnamed'}
ID: ${threadInfo.threadID}
Type: ${threadInfo.isGroup ? 'Group' : 'Personal'}
Members: ${threadInfo.participantIDs.length}
Admins: ${threadInfo.adminIDs?.length || 0}
Created: ${new Date(threadInfo.timestamp).toLocaleString()}
        `;
        
        api.sendMessage(infoText, event.threadID);
        break;
        
      default:
        api.sendMessage('Invalid action. Use: list, leave, info', event.threadID);
    }
  } catch (error) {
    console.error('Manage groups error:', error);
    api.sendMessage('❌ Error managing groups.', event.threadID);
  }
}

module.exports = manageGroups;