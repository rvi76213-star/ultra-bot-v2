const https = require('https');
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const logger = require('../utils/logger');

class AutoUpdater {
  constructor() {
    this.updateUrl = 'https://api.github.com/repos/your-username/messenger-bot/releases/latest';
    this.currentVersion = require('../../package.json').version;
    this.updateCheckInterval = 3600000; // 1 hour
    this.updateInterval = null;
  }

  async checkForUpdates() {
    try {
      logger.info('Checking for updates...');
      
      const latestRelease = await this.fetchLatestRelease();
      
      if (!latestRelease) {
        logger.warn('Could not fetch latest release');
        return null;
      }
      
      const latestVersion = latestRelease.tag_name.replace('v', '');
      const currentVersion = this.currentVersion;
      
      logger.debug(`Current: ${currentVersion}, Latest: ${latestVersion}`);
      
      if (this.compareVersions(latestVersion, currentVersion) > 0) {
        logger.info(`Update available: ${latestVersion}`);
        
        return {
          currentVersion,
          latestVersion,
          releaseNotes: latestRelease.body,
          downloadUrl: latestRelease.zipball_url,
          publishedAt: latestRelease.published_at
        };
      } else {
        logger.debug('Bot is up to date');
        return null;
      }
      
    } catch (error) {
      logger.error('Error checking for updates:', error);
      return null;
    }
  }

  async fetchLatestRelease() {
    return new Promise((resolve, reject) => {
      const options = {
        headers: {
          'User-Agent': 'Ultra-Professional-Messenger-Bot'
        }
      };
      
      https.get(this.updateUrl, options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const release = JSON.parse(data);
              resolve(release);
            } catch (error) {
              reject(new Error('Invalid JSON response'));
            }
          } else {
            reject(new Error(`GitHub API returned ${res.statusCode}`));
          }
        });
      }).on('error', reject);
    });
  }

  compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;
      
      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    }
    
    return 0;
  }

  async performUpdate(updateInfo) {
    logger.info(`Starting update to version ${updateInfo.latestVersion}`);
    
    try {
      // Step 1: Create backup
      const backupManager = require('../../deploy');
      const backupPath = await backupManager.createBackup(`pre-update-${updateInfo.latestVersion}`);
      
      // Step 2: Download update
      const updatePath = await this.downloadUpdate(updateInfo.downloadUrl);
      
      // Step 3: Extract update
      await this.extractUpdate(updatePath, backupPath);
      
      // Step 4: Install dependencies
      await this.installDependencies();
      
      // Step 5: Restart bot
      await this.restartBot();
      
      // Step 6: Verify update
      await this.verifyUpdate(updateInfo.latestVersion);
      
      logger.info(`✅ Successfully updated to version ${updateInfo.latestVersion}`);
      
      // Send notification to owner
      await this.notifyOwner(updateInfo);
      
      return true;
      
    } catch (error) {
      logger.error('Update failed:', error);
      
      // Attempt rollback
      await this.rollbackUpdate();
      
      return false;
    }
  }

  async downloadUpdate(downloadUrl) {
    const updateDir = path.join(__dirname, '../../updates');
    await fs.mkdir(updateDir, { recursive: true });
    
    const tempPath = path.join(updateDir, `update-${Date.now()}.zip`);
    
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(tempPath);
      
      https.get(downloadUrl, (res) => {
        res.pipe(file);
        
        file.on('finish', () => {
          file.close();
          resolve(tempPath);
        });
      }).on('error', (err) => {
        fs.unlink(tempPath, () => reject(err));
      });
    });
  }

  async extractUpdate(updatePath, backupPath) {
    // Extract zip file
    // Note: This is a simplified version. In production, use a proper zip library.
    const extract = require('extract-zip');
    const updateDir = path.dirname(updatePath);
    
    await extract(updatePath, { dir: updateDir });
    
    // Find extracted directory
    const files = await fs.readdir(updateDir);
    const extractedDir = files.find(f => f.startsWith('your-username-messenger-bot'));
    
    if (!extractedDir) {
      throw new Error('Could not find extracted update files');
    }
    
    const sourceDir = path.join(updateDir, extractedDir);
    const targetDir = path.join(__dirname, '../..');
    
    // Copy files, preserving backups and config
    await this.copyUpdateFiles(sourceDir, targetDir, backupPath);
    
    // Clean up
    await fs.unlink(updatePath);
    await fs.rm(sourceDir, { recursive: true, force: true });
  }

  async copyUpdateFiles(source, target, backupPath) {
    const filesToUpdate = [
      'src',
      'package.json',
      'main.js',
      'README.md'
    ];
    
    const filesToPreserve = [
      'config',
      'data',
      'assets',
      'backups',
      'src/secure/owner.lock',
      'src/secure/appstats.json'
    ];
    
    // Copy new files
    for (const file of filesToUpdate) {
      const sourcePath = path.join(source, file);
      const targetPath = path.join(target, file);
      
      if (await this.fileExists(sourcePath)) {
        // Backup existing file
        if (await this.fileExists(targetPath)) {
          const backupFile = path.join(backupPath, file);
          await fs.mkdir(path.dirname(backupFile), { recursive: true });
          await fs.copyFile(targetPath, backupFile);
        }
        
        // Copy new file
        await fs.cp(sourcePath, targetPath, { recursive: true });
        logger.debug(`Updated: ${file}`);
      }
    }
    
    // Preserve existing files
    for (const file of filesToPreserve) {
      const targetPath = path.join(target, file);
      
      if (await this.fileExists(targetPath)) {
        // File already exists, keep it
        logger.debug(`Preserved: ${file}`);
      }
    }
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async installDependencies() {
    logger.info('Installing/updating dependencies...');
    
    try {
      execSync('npm install', { stdio: 'pipe', cwd: path.join(__dirname, '../..') });
      logger.info('Dependencies installed successfully');
    } catch (error) {
      throw new Error(`Failed to install dependencies: ${error.message}`);
    }
  }

  async restartBot() {
    logger.info('Restarting bot...');
    
    try {
      // Try PM2 first
      execSync('pm2 restart messenger-bot', { stdio: 'pipe' });
      logger.info('Bot restarted via PM2');
    } catch (error) {
      logger.warn('PM2 restart failed, trying direct restart...');
      
      // Fallback to direct restart
      process.exit(0); // Let process manager restart
    }
  }

  async verifyUpdate(expectedVersion) {
    // Wait for bot to restart
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Check if bot is running
    try {
      const output = execSync('pm2 status messenger-bot').toString();
      if (!output.includes('online')) {
        throw new Error('Bot not running after update');
      }
    } catch (error) {
      throw new Error('Failed to verify bot status');
    }
    
    // Check version
    const newPackageJson = require('../../package.json');
    if (newPackageJson.version !== expectedVersion) {
      throw new Error(`Version mismatch: expected ${expectedVersion}, got ${newPackageJson.version}`);
    }
    
    logger.info('Update verified successfully');
  }

  async rollbackUpdate() {
    logger.warn('Attempting rollback...');
    
    try {
      const backupManager = require('../../deploy');
      await backupManager.rollback('auto-update-failed');
      logger.info('Rollback completed');
    } catch (error) {
      logger.error('Rollback failed:', error);
    }
  }

  async notifyOwner(updateInfo) {
    // This would send a message to the bot owner about the update
    // Implementation depends on how you want to notify
    logger.info(`Notifying owner about update to ${updateInfo.latestVersion}`);
    
    // Example: Could use the bot's API to send a message
    // api.sendMessage(ownerId, `Bot updated to v${updateInfo.latestVersion}`);
  }

  startAutoUpdateCheck() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.updateInterval = setInterval(async () => {
      try {
        const update = await this.checkForUpdates();
        
        if (update) {
          logger.info(`Auto-update available: ${update.latestVersion}`);
          
          // Ask for permission (in production, might want owner confirmation)
          // For now, just log and don't auto-update
          logger.info(`Update available but not auto-installing. Use !update to install.`);
        }
      } catch (error) {
        logger.error('Auto-update check failed:', error);
      }
    }, this.updateCheckInterval);
    
    logger.info('Auto-update check started');
  }

  stopAutoUpdateCheck() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    logger.info('Auto-update check stopped');
  }
}

module.exports = new AutoUpdater();