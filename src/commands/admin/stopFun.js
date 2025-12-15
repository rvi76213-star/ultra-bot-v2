const guard = require('../../secure/guard');

function stopFun(api, event) {
  const userId = event.senderID;
  guard.requireAdmin(userId);

  if (global.funIntervals && global.funIntervals[event.threadID]) {
    clearInterval(global.funIntervals[event.threadID]);
    delete global.funIntervals[event.threadID];
    api.sendMessage('⛔ Fun stopped in this thread.', event.threadID);
  } else {
    api.sendMessage('No active fun found in this thread.', event.threadID);
  }
}

module.exports = stopFun;