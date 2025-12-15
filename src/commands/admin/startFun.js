const guard = require('../../secure/guard');
const { getRandomDelay, delay } = require('../../utils/delay');
const fs = require('fs');
const path = require('path');

async function startFun(api, event, args) {
  const userId = event.senderID;
  guard.requireAdmin(userId);

  const funType = args[0];
  const validTypes = ['chor', 'murgi', 'abal', 'senior', 'cow', 'goat'];
  
  if (!funType || !validTypes.includes(funType)) {
    api.sendMessage(`Usage: !startfun [${validTypes.join('|')}]`, event.threadID);
    return;
  }

  const jsonPath = path.join(__dirname, `../../data/fun-json/${funType}.json`);
  if (!fs.existsSync(jsonPath)) {
    api.sendMessage(`Fun file for ${funType} not found.`, event.threadID);
    return;
  }

  const lines = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  let index = 0;

  const interval = setInterval(() => {
    if (index >= lines.length) index = 0;
    api.sendMessage(lines[index], event.threadID);
    index++;
  }, getRandomDelay());

  // Store interval ID to stop later
  global.funIntervals = global.funIntervals || {};
  global.funIntervals[event.threadID] = interval;

  api.sendMessage(`✅ ${funType} fun started in this thread.`, event.threadID);
}

module.exports = startFun;