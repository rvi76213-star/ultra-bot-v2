const fs = require('fs');
const path = require('path');

function stats(api, event) {
  const statsPath = path.join(__dirname, '../../../data/logs/stats.json');
  
  try {
    let statsData = { totalCommands: 0, funUses: 0, userCount: 0 };
    
    if (fs.existsSync(statsPath)) {
      statsData = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
    }
    
    const statsText = `
📊 BOT STATISTICS

📈 Usage Stats:
• Total Commands Executed: ${statsData.totalCommands || 0}
• Fun Commands Used: ${statsData.funUses || 0}
• Unique Users: ${statsData.userCount || 0}

⚙️ System Status:
• Bot Uptime: ${process.uptime().toFixed(2)} seconds
• Memory Usage: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB
• Node.js Version: ${process.version}
    `;
    
    // Update stats
    statsData.totalCommands = (statsData.totalCommands || 0) + 1;
    if (!statsData.users) statsData.users = [];
    if (!statsData.users.includes(event.senderID)) {
      statsData.users.push(event.senderID);
      statsData.userCount = statsData.users.length;
    }
    
    fs.writeFileSync(statsPath, JSON.stringify(statsData, null, 2));
    
    api.sendMessage(statsText, event.threadID);
  } catch (error) {
    api.sendMessage('❌ Error fetching statistics.', event.threadID);
    console.error('Stats error:', error);
  }
}

module.exports = stats;