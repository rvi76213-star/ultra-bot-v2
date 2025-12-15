const guard = require('../../secure/guard');
const fs = require('fs');
const path = require('path');

function updateFunJSON(api, event, args) {
  const userId = event.senderID;
  guard.requireAdmin(userId);
  
  if (args.length < 2) {
    api.sendMessage('Usage: !updatefun [type] [text]', event.threadID);
    return;
  }
  
  const funType = args[0].toLowerCase();
  const validTypes = ['chor', 'murgi', 'abal', 'senior', 'cow', 'goat'];
  
  if (!validTypes.includes(funType)) {
    api.sendMessage(`Invalid type. Use: ${validTypes.join(', ')}`, event.threadID);
    return;
  }
  
  const text = args.slice(1).join(' ');
  const jsonPath = path.join(__dirname, `../../../data/fun-json/${funType}.json`);
  
  try {
    let existingData = [];
    if (fs.existsSync(jsonPath)) {
      existingData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    }
    
    existingData.push(text);
    
    fs.writeFileSync(jsonPath, JSON.stringify(existingData, null, 2));
    
    api.sendMessage(`✅ Added new line to ${funType}.json\nTotal lines: ${existingData.length}`, event.threadID);
  } catch (error) {
    console.error('Update fun error:', error);
    api.sendMessage('❌ Failed to update fun JSON.', event.threadID);
  }
}

module.exports = updateFunJSON;