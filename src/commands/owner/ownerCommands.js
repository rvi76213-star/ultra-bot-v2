const guard = require('../../secure/guard');
const logger = require('../../utils/logger');
const rateLimiter = require('../../utils/rateLimiter');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

module.exports = {
  // Emergency system control
  emergencystop: async (api, event) => {
    guard.requireOwner(event.senderID);
    
    // Stop all fun intervals globally
    let stoppedCount = 0;
    if (global.funIntervals) {
      Object.entries(global.funIntervals).forEach(([threadId, interval]) => {
        clearInterval(interval);
        stoppedCount++;
      });
      global.funIntervals = {};
    }
    
    // Clear any pending operations
    if (global.pendingOperations) {
      global.pendingOperations.forEach(op => clearTimeout(op));
      global.pendingOperations = [];
    }
    
    logger.warn('EMERGENCY STOP executed by owner', {
      ownerId: event.senderID,
      stoppedIntervals: stoppedCount
    });
    
    api.sendMessage(`🚨 EMERGENCY STOP COMPLETE\n• Stopped ${stoppedCount} fun loops\n• Cleared pending operations\n• System stabilized`, event.threadID);
  },
  
  shutdown: async (api, event, args) => {
    guard.requireOwner(event.senderID);
    
    const delay = parseInt(args[0]) || 5;
    
    if (delay < 1 || delay > 60) {
      api.sendMessage('❌ Invalid delay. Use 1-60 seconds.', event.threadID);
      return;
    }
    
    const shutdownMessage = `🛑 SYSTEM SHUTDOWN INITIATED\n\n` +
      `Time: ${new Date().toLocaleString()}\n` +
      `Owner: ${event.senderID}\n` +
      `Delay: ${delay} seconds\n\n` +
      `All operations will stop. Bot will exit.`;
    
    api.sendMessage(shutdownMessage, event.threadID);
    
    // Notify all active threads
    try {
      const threads = await api.getThreadList(50, null, ['INBOX']);
      const notificationPromises = threads.map(thread => {
        if (thread.threadID !== event.threadID) {
          return api.sendMessage(
            `⚠️ Bot shutdown in progress. Commands disabled.`,
            thread.threadID
          ).catch(() => {}); // Ignore errors
        }
      });
      
      await Promise.allSettled(notificationPromises);
    } catch (error) {
      logger.error('Error notifying threads during shutdown:', error);
    }
    
    // Countdown
    for (let i = delay; i > 0; i--) {
      if (i <= 3 || i % 10 === 0) {
        api.sendMessage(`Shutdown in ${i}...`, event.threadID);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    logger.info('SYSTEM SHUTDOWN by owner', {
      ownerId: event.senderID,
      delay
    });
    
    api.sendMessage('👋 Goodbye!', event.threadID);
    
    // Graceful exit
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  },
  
  // Admin management
  addadmin: async (api, event, args) => {
    guard.requireOwner(event.senderID);
    
    if (!args[0]) {
      api.sendMessage('Usage: !addadmin [userID] [optional: name]', event.threadID);
      return;
    }
    
    const userId = args[0];
    const name = args[1] || 'Unknown';
    
    // Validate user ID
    if (!/^\d{10,}$/.test(userId)) {
      api.sendMessage('❌ Invalid user ID format. Must be numeric and at least 10 digits.', event.threadID);
      return;
    }
    
    try {
      const configPath = path.join(__dirname, '../../../config/config.json');
      const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
      
      if (config.admins.includes(userId)) {
        api.sendMessage('⚠️ User is already an admin.', event.threadID);
        return;
      }
      
      // Get user info for confirmation
      let userInfo = { name: 'Unknown User' };
      try {
        const info = await api.getUserInfo([userId]);
        userInfo = info[userId] || userInfo;
      } catch (error) {
        logger.warn('Could not fetch user info:', error);
      }
      
      config.admins.push(userId);
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
      
      // Log the action
      logger.info('Admin added by owner', {
        ownerId: event.senderID,
        newAdminId: userId,
        newAdminName: userInfo.name || name
      });
      
      const response = `✅ ADMIN ADDED SUCCESSFULLY\n\n` +
        `User ID: ${userId}\n` +
        `Name: ${userInfo.name || name}\n` +
        `Added by: ${event.senderID}\n` +
        `Time: ${new Date().toLocaleString()}\n\n` +
        `Total Admins: ${config.admins.length}`;
      
      api.sendMessage(response, event.threadID);
      
      // Notify the new admin if possible
      try {
        await api.sendMessage(
          `🎉 You have been promoted to Admin!\n\n` +
          `You now have access to admin commands.\n` +
          `Use !help to see available commands.`,
          userId
        );
      } catch (error) {
        logger.warn('Could not notify new admin:', error);
      }
      
    } catch (error) {
      logger.error('Error adding admin:', error);
      api.sendMessage('❌ Error adding admin. Check logs.', event.threadID);
    }
  },
  
  removeadmin: async (api, event, args) => {
    guard.requireOwner(event.senderID);
    
    if (!args[0]) {
      api.sendMessage('Usage: !removeadmin [userID]', event.threadID);
      return;
    }
    
    const userId = args[0];
    
    try {
      const configPath = path.join(__dirname, '../../../config/config.json');
      const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
      
      const index = config.admins.indexOf(userId);
      if (index === -1) {
        api.sendMessage('❌ User is not an admin.', event.threadID);
        return;
      }
      
      // Prevent removing owner
      if (userId === config.ownerUid) {
        api.sendMessage('❌ Cannot remove owner from admins.', event.threadID);
        return;
      }
      
      const removedAdmin = config.admins.splice(index, 1)[0];
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
      
      logger.warn('Admin removed by owner', {
        ownerId: event.senderID,
        removedAdminId: removedAdmin
      });
      
      api.sendMessage(`✅ Admin removed: ${removedAdmin}\nRemaining admins: ${config.admins.length}`, event.threadID);
      
      // Notify removed admin
      try {
        await api.sendMessage(
          `⚠️ Your admin privileges have been removed.\n\n` +
          `If this was a mistake, contact the bot owner.`,
          userId
        );
      } catch (error) {
        logger.warn('Could not notify removed admin:', error);
      }
      
    } catch (error) {
      logger.error('Error removing admin:', error);
      api.sendMessage('❌ Error removing admin.', event.threadID);
    }
  },
  
  // System diagnostics
  diagnostics: async (api, event) => {
    guard.requireOwner(event.senderID);
    
    const diagnostics = [];
    
    // 1. System health
    diagnostics.push('📊 SYSTEM DIAGNOSTICS');
    diagnostics.push(`• Uptime: ${(process.uptime() / 3600).toFixed(2)} hours`);
    diagnostics.push(`• Memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`);
    diagnostics.push(`• Node: ${process.version}`);
    diagnostics.push('');
    
    // 2. Bot status
    diagnostics.push('🤖 BOT STATUS');
    diagnostics.push(`• Active threads: ${global.activeThreads || 0}`);
    diagnostics.push(`• Fun loops: ${global.funIntervals ? Object.keys(global.funIntervals).length : 0}`);
    diagnostics.push(`• Cache size: ${global.cache ? global.cache.getStats().keys : 'N/A'}`);
    diagnostics.push('');
    
    // 3. Rate limits
    const rateStats = rateLimiter.getStats();
    diagnostics.push('⚡ RATE LIMITS');
    diagnostics.push(`• Tracked users: ${rateStats.totalUsers}`);
    diagnostics.push(`• Tracked threads: ${rateStats.totalThreads}`);
    diagnostics.push(`• Recent blocks: ${rateStats.totalBlocks}`);
    diagnostics.push('');
    
    // 4. Security status
    diagnostics.push('🔐 SECURITY STATUS');
    try {
      const ownerLockPath = path.join(__dirname, '../../secure/owner.lock');
      const ownerData = JSON.parse(await fs.readFile(ownerLockPath, 'utf8'));
      const age = Date.now() - new Date(ownerData.lockedAt).getTime();
      diagnostics.push(`• Owner locked: ${(age / (1000 * 60 * 60 * 24)).toFixed(2)} days ago`);
      diagnostics.push(`• Owner hash: ${ownerData.ownerHash.substring(0, 12)}...`);
    } catch (error) {
      diagnostics.push('• Owner lock: ❌ ERROR');
    }
    diagnostics.push('');
    
    // 5. Recent logs (last 3 errors)
    diagnostics.push('📝 RECENT ERRORS');
    try {
      const logDir = path.join(__dirname, '../../../data/logs');
      const today = new Date().toISOString().split('T')[0];
      const logFile = path.join(logDir, `${today}.log`);
      
      if (await fs.access(logFile).then(() => true).catch(() => false)) {
        const logs = await fs.readFile(logFile, 'utf8');
        const errorLines = logs.split('\n').filter(line => line.includes('[ERROR]')).slice(-3);
        errorLines.forEach(err => {
          const cleanErr = err.substring(Math.max(0, err.length - 100));
          diagnostics.push(`• ${cleanErr}`);
        });
      } else {
        diagnostics.push('• No errors today');
      }
    } catch (error) {
      diagnostics.push('• Error reading logs');
    }
    
    api.sendMessage(diagnostics.join('\n'), event.threadID);
  },
  
  // Config management
  reloadconfig: async (api, event) => {
    guard.requireOwner(event.senderID);
    
    try {
      delete require.cache[require.resolve('../../../config/config.json')];
      delete require.cache[require.resolve('../../../config/settings.json')];
      
      const config = require('../../../config/config.json');
      const settings = require('../../../config/settings.json');
      
      logger.info('Config reloaded by owner', {
        ownerId: event.senderID
      });
      
      const response = `🔄 CONFIG RELOADED\n\n` +
        `Config version: ${config._version || 'N/A'}\n` +
        `Admins: ${config.admins.length}\n` +
        `Prefix: ${config.prefix}\n` +
        `Fun enabled: ${config.funEnabled}\n\n` +
        `Settings loaded: ${Object.keys(settings).length} sections`;
      
      api.sendMessage(response, event.threadID);
    } catch (error) {
      logger.error('Error reloading config:', error);
      api.sendMessage('❌ Error reloading config.', event.threadID);
    }
  },
  
  // Advanced owner commands
  execute: async (api, event, args) => {
    guard.requireOwner(event.senderID);
    
    if (!args[0]) {
      api.sendMessage('Usage: !execute [code snippet]', event.threadID);
      return;
    }
    
    const code = args.join(' ');
    
    // Safety check - prevent dangerous operations
    const dangerousPatterns = [
      /process\.exit/,
      /require\s*\(\s*["']fs["']\s*\)/,
      /child_process/,
      /eval\s*\(/,
      /Function\s*\(/
    ];
    
    if (dangerousPatterns.some(pattern => pattern.test(code))) {
      api.sendMessage('❌ Dangerous operation blocked.', event.threadID);
      return;
    }
    
    try {
      // Create a safe execution context
      const sandbox = {
        api,
        event,
        args: args.slice(1),
        console,
        Date,
        Math,
        JSON,
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        Buffer,
        require: (module) => {
          const allowed = ['path', 'crypto', 'util', 'url', 'querystring'];
          if (!allowed.includes(module)) {
            throw new Error(`Module ${module} not allowed`);
          }
          return require(module);
        }
      };
      
      // Execute in sandbox
      const result = new Function(...Object.keys(sandbox), `
        "use strict";
        try {
          return ${code};
        } catch (error) {
          return "Error: " + error.message;
        }
      `)(...Object.values(sandbox));
      
      logger.warn('Code executed by owner', {
        ownerId: event.senderID,
        code: code.substring(0, 100),
        result: typeof result
      });
      
      const response = `⚡ CODE EXECUTED\n\n` +
        `Code: ${code.substring(0, 50)}${code.length > 50 ? '...' : ''}\n\n` +
        `Result:\n${typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)}`;
      
      api.sendMessage(response.substring(0, 2000), event.threadID);
    } catch (error) {
      logger.error('Code execution error:', error);
      api.sendMessage(`❌ Execution error: ${error.message}`, event.threadID);
    }
  },
  
  // Backup system
  backup: async (api, event, args) => {
    guard.requireOwner(event.senderID);
    
    const backupType = args[0] || 'config';
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(__dirname, '../../../backups');
      
      await fs.mkdir(backupDir, { recursive: true });
      
      let backupFiles = [];
      
      switch (backupType) {
        case 'config':
          backupFiles = [
            { src: '../../../config/config.json', dest: `config-${timestamp}.json` },
            { src: '../../../config/settings.json', dest: `settings-${timestamp}.json` }
          ];
          break;
          
        case 'data':
          backupFiles = [
            { src: '../../../data/fun-json', dest: `fun-json-${timestamp}` },
            { src: '../../../data/logs', dest: `logs-${timestamp}` },
            { src: '../../../data/admin-photos', dest: `admin-photos-${timestamp}` }
          ];
          break;
          
        case 'full':
          backupFiles = [
            { src: '../../../config', dest: `config-${timestamp}` },
            { src: '../../../data', dest: `data-${timestamp}` },
            { src: '../../../assets', dest: `assets-${timestamp}` },
            { src: '../../secure/owner.lock', dest: `owner-lock-${timestamp}.json` }
          ];
          break;
          
        default:
          api.sendMessage('❌ Invalid backup type. Use: config, data, full', event.threadID);
          return;
      }
      
      // Create backup
      const backupPromises = backupFiles.map(async ({ src, dest }) => {
        const srcPath = path.join(__dirname, src);
        const destPath = path.join(backupDir, dest);
        
        const stats = await fs.stat(srcPath);
        if (stats.isDirectory()) {
          // Copy directory
          await fs.cp(srcPath, destPath, { recursive: true });
        } else {
          // Copy file
          await fs.copyFile(srcPath, destPath);
        }
        
        return { source: src, destination: dest, size: stats.size };
      });
      
      const results = await Promise.allSettled(backupPromises);
      
      const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value);
      const failed = results.filter(r => r.status === 'rejected').map(r => r.reason);
      
      logger.info('Backup created by owner', {
        ownerId: event.senderID,
        type: backupType,
        successful: successful.length,
        failed: failed.length
      });
      
      let response = `💾 BACKUP CREATED\n\n` +
        `Type: ${backupType}\n` +
        `Timestamp: ${timestamp}\n` +
        `Location: ${backupDir}\n\n` +
        `Successful: ${successful.length} items\n`;
      
      if (failed.length > 0) {
        response += `Failed: ${failed.length} items\n`;
        response += `First error: ${failed[0]?.message || 'Unknown'}\n`;
      }
      
      if (successful.length > 0) {
        response += `\n📦 Backup contents:\n`;
        successful.slice(0, 5).forEach(item => {
          response += `• ${item.source} → ${item.destination}\n`;
        });
        if (successful.length > 5) {
          response += `• ...and ${successful.length - 5} more\n`;
        }
      }
      
      api.sendMessage(response, event.threadID);
      
    } catch (error) {
      logger.error('Backup error:', error);
      api.sendMessage(`❌ Backup failed: ${error.message}`, event.threadID);
    }
  },
  
  // System cleanup
  cleanup: async (api, event, args) => {
    guard.requireOwner(event.senderID);
    
    const cleanupType = args[0] || 'cache';
    
    try {
      let cleaned = 0;
      let message = '';
      
      switch (cleanupType) {
        case 'cache':
          if (global.cacheManager) {
            cleaned = global.cacheManager.getStats().keys;
            global.cacheManager.flush();
            message = `🧹 Cleared cache: ${cleaned} items`;
          }
          break;
          
        case 'logs':
          const logDir = path.join(__dirname, '../../../data/logs');
          const files = await fs.readdir(logDir);
          const oldLogs = files.filter(f => f.endsWith('.log') && !f.includes(new Date().toISOString().split('T')[0]));
          
          for (const file of oldLogs.slice(0, 10)) { // Limit to 10 files
            await fs.unlink(path.join(logDir, file));
            cleaned++;
          }
          message = `🗑️ Cleared old logs: ${cleaned} files`;
          break;
          
        case 'temp':
          // Clear temporary intervals and timeouts
          let intervalsCleared = 0;
          let timeoutsCleared = 0;
          
          // Clear global intervals (except funIntervals)
          for (const key in global) {
            if (key.includes('Interval') && key !== 'funIntervals') {
              clearInterval(global[key]);
              intervalsCleared++;
            }
            if (key.includes('Timeout')) {
              clearTimeout(global[key]);
              timeoutsCleared++;
            }
          }
          
          message = `🔄 Cleared temps: ${intervalsCleared} intervals, ${timeoutsCleared} timeouts`;
          break;
          
        default:
          api.sendMessage('❌ Invalid cleanup type. Use: cache, logs, temp', event.threadID);
          return;
      }
      
      logger.info('Cleanup performed by owner', {
        ownerId: event.senderID,
        type: cleanupType,
        cleaned
      });
      
      api.sendMessage(`${message}\n\n✅ Cleanup completed successfully.`, event.threadID);
      
    } catch (error) {
      logger.error('Cleanup error:', error);
      api.sendMessage(`❌ Cleanup failed: ${error.message}`, event.threadID);
    }
  }
};