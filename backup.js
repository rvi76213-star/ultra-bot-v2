const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const chalk = require('chalk');
const moment = require('moment');

console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════╗
║            🤖 BOT BACKUP SYSTEM                      ║
║            👑 RANA (MASTER 🪓)                      ║
╚══════════════════════════════════════════════════════╝
`));

class BotBackup {
    constructor() {
        this.backupDir = path.join(__dirname, 'backups');
        this.timestamp = moment().format('YYYYMMDD_HHmmss');
        this.backupName = `bot_backup_${this.timestamp}`;
    }

    async createBackup() {
        try {
            // Create backup directory
            await fs.ensureDir(this.backupDir);
            
            const backupPath = path.join(this.backupDir, `${this.backupName}.zip`);
            const output = fs.createWriteStream(backupPath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            return new Promise((resolve, reject) => {
                output.on('close', () => {
                    const size = (archive.pointer() / 1024 / 1024).toFixed(2);
                    console.log(chalk.green(`✅ Backup created: ${backupPath}`));
                    console.log(chalk.blue(`📦 Size: ${size} MB`));
                    resolve({ path: backupPath, size: size });
                });

                archive.on('error', (err) => {
                    reject(err);
                });

                archive.pipe(output);

                // Add important directories and files
                const itemsToBackup = [
                    { path: 'config', name: 'config' },
                    { path: 'data', name: 'data' },
                    { path: 'assets', name: 'assets' },
                    { path: 'src/secure/appstate.json', name: 'secure/appstate.json' },
                    { path: 'src/secure/owner.lock', name: 'secure/owner.lock' },
                    { path: 'package.json', name: 'package.json' },
                    { path: 'package-lock.json', name: 'package-lock.json' }
                ];

                itemsToBackup.forEach(item => {
                    if (fs.existsSync(item.path)) {
                        const stat = fs.statSync(item.path);
                        if (stat.isDirectory()) {
                            archive.directory(item.path, item.name);
                            console.log(chalk.green(`  📁 Added: ${item.path}`));
                        } else if (stat.isFile()) {
                            archive.file(item.path, { name: item.name });
                            console.log(chalk.green(`  📄 Added: ${item.path}`));
                        }
                    }
                });

                // Add manifest file
                const manifest = {
                    timestamp: this.timestamp,
                    backupName: this.backupName,
                    items: itemsToBackup.map(item => item.name),
                    botVersion: require('./package.json').version || '2.0.0',
                    createdAt: new Date().toISOString()
                };

                archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

                archive.finalize();
            });

        } catch (error) {
            console.error(chalk.red('❌ Backup failed:'), error);
            throw error;
        }
    }

    async listBackups() {
        try {
            await fs.ensureDir(this.backupDir);
            
            const files = await fs.readdir(this.backupDir);
            const backups = files
                .filter(file => file.endsWith('.zip'))
                .map(file => {
                    const filePath = path.join(this.backupDir, file);
                    const stats = fs.statSync(filePath);
                    return {
                        name: file,
                        path: filePath,
                        size: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
                        modified: stats.mtime,
                        date: moment(stats.mtime).format('YYYY-MM-DD HH:mm:ss')
                    };
                })
                .sort((a, b) => b.modified - a.modified); // Sort by date (newest first)

            if (backups.length === 0) {
                console.log(chalk.yellow('📭 No backups found.'));
                return [];
            }

            console.log(chalk.blue(`\n📋 Found ${backups.length} backup(s):`));
            backups.forEach((backup, index) => {
                console.log(chalk.cyan(`\n${index + 1}. ${backup.name}`));
                console.log(`   Size: ${backup.size}`);
                console.log(`   Date: ${backup.date}`);
            });

            return backups;
        } catch (error) {
            console.error(chalk.red('❌ Failed to list backups:'), error);
            return [];
        }
    }

    async restoreBackup(backupName) {
        try {
            const backupPath = path.join(this.backupDir, backupName);
            
            if (!fs.existsSync(backupPath)) {
                throw new Error(`Backup not found: ${backupName}`);
            }

            console.log(chalk.yellow(`\n⚠️ RESTORING BACKUP: ${backupName}`));
            console.log(chalk.yellow('This will overwrite existing files!'));
            
            // Confirm restoration
            const readline = require('readline');
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            const answer = await new Promise(resolve => {
                rl.question(chalk.red('Type "RESTORE" to confirm: '), resolve);
            });
            rl.close();

            if (answer !== 'RESTORE') {
                console.log(chalk.yellow('❌ Restoration cancelled.'));
                return false;
            }

            // Extract backup
            const extract = require('extract-zip');
            const tempDir = path.join(__dirname, 'temp_restore');
            
            // Clean temp directory
            if (fs.existsSync(tempDir)) {
                await fs.remove(tempDir);
            }
            await fs.ensureDir(tempDir);

            console.log(chalk.blue('📦 Extracting backup...'));
            await extract(backupPath, { dir: tempDir });

            // Read manifest
            const manifestPath = path.join(tempDir, 'manifest.json');
            if (!fs.existsSync(manifestPath)) {
                throw new Error('Invalid backup: manifest.json not found');
            }

            const manifest = await fs.readJson(manifestPath);
            console.log(chalk.blue(`📝 Backup info: ${manifest.backupName}`));
            console.log(chalk.blue(`📅 Created: ${manifest.createdAt}`));

            // Restore files
            console.log(chalk.blue('\n🔄 Restoring files...'));

            // Restore config directory
            if (fs.existsSync(path.join(tempDir, 'config'))) {
                await fs.copy(path.join(tempDir, 'config'), 'config', { overwrite: true });
                console.log(chalk.green('  ✅ Restored: config/'));
            }

            // Restore data directory
            if (fs.existsSync(path.join(tempDir, 'data'))) {
                await fs.copy(path.join(tempDir, 'data'), 'data', { overwrite: true });
                console.log(chalk.green('  ✅ Restored: data/'));
            }

            // Restore assets directory
            if (fs.existsSync(path.join(tempDir, 'assets'))) {
                await fs.copy(path.join(tempDir, 'assets'), 'assets', { overwrite: true });
                console.log(chalk.green('  ✅ Restored: assets/'));
            }

            // Restore secure files
            const secureFiles = ['appstate.json', 'owner.lock'];
            for (const file of secureFiles) {
                const source = path.join(tempDir, 'secure', file);
                const dest = path.join('src/secure', file);
                
                if (fs.existsSync(source)) {
                    await fs.copy(source, dest, { overwrite: true });
                    console.log(chalk.green(`  ✅ Restored: src/secure/${file}`));
                }
            }

            // Cleanup temp directory
            await fs.remove(tempDir);

            console.log(chalk.green.bold('\n✅ BACKUP RESTORED SUCCESSFULLY!'));
            console.log(chalk.cyan('You may need to restart the bot for changes to take effect.'));

            return true;

        } catch (error) {
            console.error(chalk.red('❌ Restoration failed:'), error);
            return false;
        }
    }

    async cleanupOldBackups(daysToKeep = 30) {
        try {
            await fs.ensureDir(this.backupDir);
            
            const files = await fs.readdir(this.backupDir);
            const backups = files.filter(file => file.endsWith('.zip'));
            
            const cutoffDate = moment().subtract(daysToKeep, 'days');
            let deletedCount = 0;

            for (const file of backups) {
                const filePath = path.join(this.backupDir, file);
                const stats = fs.statSync(filePath);
                const fileDate = moment(stats.mtime);

                if (fileDate.isBefore(cutoffDate)) {
                    await fs.unlink(filePath);
                    deletedCount++;
                    console.log(chalk.yellow(`  🗑️ Deleted old backup: ${file}`));
                }
            }

            if (deletedCount > 0) {
                console.log(chalk.green(`\n✅ Cleaned up ${deletedCount} old backup(s)`));
            } else {
                console.log(chalk.blue('\n📭 No old backups to clean up'));
            }

            return deletedCount;
        } catch (error) {
            console.error(chalk.red('❌ Cleanup failed:'), error);
            return 0;
        }
    }

    async getBackupStats() {
        try {
            await fs.ensureDir(this.backupDir);
            
            const files = await fs.readdir(this.backupDir);
            const backups = files.filter(file => file.endsWith('.zip'));
            
            let totalSize = 0;
            const oldest = { date: null, name: '' };
            const newest = { date: null, name: '' };

            for (const file of backups) {
                const filePath = path.join(this.backupDir, file);
                const stats = fs.statSync(filePath);
                totalSize += stats.size;

                const fileDate = stats.mtime;
                if (!oldest.date || fileDate < oldest.date) {
                    oldest.date = fileDate;
                    oldest.name = file;
                }
                if (!newest.date || fileDate > newest.date) {
                    newest.date = fileDate;
                    newest.name = file;
                }
            }

            return {
                totalBackups: backups.length,
                totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
                oldestBackup: oldest.name ? {
                    name: oldest.name,
                    date: moment(oldest.date).format('YYYY-MM-DD')
                } : null,
                newestBackup: newest.name ? {
                    name: newest.name,
                    date: moment(newest.date).format('YYYY-MM-DD HH:mm:ss')
                } : null
            };
        } catch (error) {
            console.error(chalk.red('❌ Failed to get backup stats:'), error);
            return null;
        }
    }
}

async function main() {
    const backup = new BotBackup();
    const args = process.argv.slice(2);
    const action = args[0] || 'create';

    switch (action) {
        case 'create':
            console.log(chalk.blue('Creating new backup...'));
            await backup.createBackup();
            break;

        case 'list':
            console.log(chalk.blue('Listing backups...'));
            await backup.listBackups();
            break;

        case 'restore':
            const backupName = args[1];
            if (!backupName) {
                console.log(chalk.red('❌ Please specify backup name: npm run backup restore <backup-name>'));
                console.log(chalk.yellow('   Example: npm run backup restore bot_backup_20240115_123000.zip'));
                return;
            }
            await backup.restoreBackup(backupName);
            break;

        case 'cleanup':
            const days = parseInt(args[1]) || 30;
            console.log(chalk.blue(`Cleaning up backups older than ${days} days...`));
            await backup.cleanupOldBackups(days);
            break;

        case 'stats':
            console.log(chalk.blue('Backup statistics...'));
            const stats = await backup.getBackupStats();
            if (stats) {
                console.log(chalk.cyan(`\n📊 Backup Statistics:`));
                console.log(`Total Backups: ${stats.totalBackups}`);
                console.log(`Total Size: ${stats.totalSizeMB} MB`);
                if (stats.oldestBackup) {
                    console.log(`Oldest: ${stats.oldestBackup.name} (${stats.oldestBackup.date})`);
                }
                if (stats.newestBackup) {
                    console.log(`Newest: ${stats.newestBackup.name} (${stats.newestBackup.date})`);
                }
            }
            break;

        case 'help':
        default:
            console.log(chalk.cyan('\n📖 BACKUP SYSTEM HELP:'));
            console.log('Usage: npm run backup <command>');
            console.log('\nCommands:');
            console.log('  create    - Create new backup');
            console.log('  list      - List all backups');
            console.log('  restore   - Restore from backup');
            console.log('  cleanup   - Clean old backups');
            console.log('  stats     - Show backup statistics');
            console.log('  help      - Show this help');
            console.log('\nExamples:');
            console.log('  npm run backup create');
            console.log('  npm run backup list');
            console.log('  npm run backup restore bot_backup_20240115_123000.zip');
            console.log('  npm run backup cleanup 30');
    }
}

// Run backup system
if (require.main === module) {
    main().catch(console.error);
}

module.exports = BotBackup;