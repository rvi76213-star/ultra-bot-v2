const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');
const logger = require('./logger');

class StatsManager {
    constructor() {
        this.statsFile = path.join(__dirname, '../../data/stats.json');
        this.stats = {
            startTime: null,
            messagesSent: 0,
            messagesReceived: 0,
            commandsExecuted: 0,
            funCommandsExecuted: 0,
            errors: 0,
            uptime: 0,
            users: new Set(),
            groups: new Set(),
            commandUsage: {},
            dailyStats: {},
            hourlyStats: {}
        };
        
        this.init();
    }

    async init() {
        try {
            await fs.ensureDir(path.dirname(this.statsFile));
            
            if (await fs.pathExists(this.statsFile)) {
                const saved = await fs.readJson(this.statsFile);
                this.stats = { ...this.stats, ...saved };
                
                // Convert arrays back to Sets
                if (saved.users) this.stats.users = new Set(saved.users);
                if (saved.groups) this.stats.groups = new Set(saved.groups);
            }
            
            this.stats.startTime = this.stats.startTime || new Date().toISOString();
            logger.success('Stats manager initialized');
        } catch (error) {
            logger.error('Failed to initialize stats:', error);
        }
    }

    async save() {
        try {
            const toSave = {
                ...this.stats,
                users: Array.from(this.stats.users),
                groups: Array.from(this.stats.groups)
            };
            
            await fs.writeJson(this.statsFile, toSave, { spaces: 2 });
        } catch (error) {
            logger.error('Failed to save stats:', error);
        }
    }

    // Message stats
    messageSent(threadID, userID = null) {
        this.stats.messagesSent++;
        
        if (userID) {
            this.stats.users.add(userID);
        }
        
        if (threadID && !threadID.includes('@')) {
            this.stats.groups.add(threadID);
        }
        
        this.updateDailyStats('messagesSent');
        this.updateHourlyStats('messagesSent');
    }

    messageReceived(threadID, userID = null) {
        this.stats.messagesReceived++;
        
        if (userID) {
            this.stats.users.add(userID);
        }
        
        this.updateDailyStats('messagesReceived');
        this.updateHourlyStats('messagesReceived');
    }

    // Command stats
    commandExecuted(command, userID, success = true) {
        this.stats.commandsExecuted++;
        
        if (!this.stats.commandUsage[command]) {
            this.stats.commandUsage[command] = {
                count: 0,
                users: new Set(),
                successes: 0,
                failures: 0
            };
        }
        
        const cmdStats = this.stats.commandUsage[command];
        cmdStats.count++;
        cmdStats.users.add(userID);
        
        if (success) {
            cmdStats.successes++;
        } else {
            cmdStats.failures++;
            this.stats.errors++;
        }
        
        this.updateDailyStats('commandsExecuted');
        this.updateHourlyStats('commandsExecuted');
        
        // Auto-save every 10 commands
        if (this.stats.commandsExecuted % 10 === 0) {
            this.save();
        }
    }

    // Fun command stats
    funCommandExecuted(type, threadID) {
        this.stats.funCommandsExecuted++;
        
        if (!this.stats.commandUsage[`fun_${type}`]) {
            this.stats.commandUsage[`fun_${type}`] = {
                count: 0,
                threads: new Set(),
                duration: 0
            };
        }
        
        const funStats = this.stats.commandUsage[`fun_${type}`];
        funStats.count++;
        funStats.threads.add(threadID);
        
        this.updateDailyStats('funCommandsExecuted');
    }

    // Error tracking
    errorOccurred(errorType, context = null) {
        this.stats.errors++;
        
        if (!this.stats.commandUsage.errors) {
            this.stats.commandUsage.errors = {};
        }
        
        if (!this.stats.commandUsage.errors[errorType]) {
            this.stats.commandUsage.errors[errorType] = 0;
        }
        
        this.stats.commandUsage.errors[errorType]++;
        
        this.updateDailyStats('errors');
    }

    // Update daily stats
    updateDailyStats(metric) {
        const today = moment().format('YYYY-MM-DD');
        
        if (!this.stats.dailyStats[today]) {
            this.stats.dailyStats[today] = {
                messagesSent: 0,
                messagesReceived: 0,
                commandsExecuted: 0,
                funCommandsExecuted: 0,
                errors: 0,
                activeUsers: new Set(),
                activeGroups: new Set()
            };
        }
        
        if (metric in this.stats.dailyStats[today]) {
            this.stats.dailyStats[today][metric]++;
        }
    }

    // Update hourly stats
    updateHourlyStats(metric) {
        const hour = moment().format('YYYY-MM-DD HH:00');
        
        if (!this.stats.hourlyStats[hour]) {
            this.stats.hourlyStats[hour] = {
                messagesSent: 0,
                messagesReceived: 0,
                commandsExecuted: 0
            };
        }
        
        if (metric in this.stats.hourlyStats[hour]) {
            this.stats.hourlyStats[hour][metric]++;
        }
    }

    // Add active user/group
    addActiveUser(userID) {
        const today = moment().format('YYYY-MM-DD');
        if (this.stats.dailyStats[today]) {
            this.stats.dailyStats[today].activeUsers.add(userID);
        }
    }

    addActiveGroup(groupID) {
        const today = moment().format('YYYY-MM-DD');
        if (this.stats.dailyStats[today]) {
            this.stats.dailyStats[today].activeGroups.add(groupID);
        }
    }

    // Get statistics
    getStats() {
        const now = moment();
        const start = moment(this.stats.startTime);
        const uptime = moment.duration(now.diff(start));
        
        // Calculate active users/groups for today
        const today = moment().format('YYYY-MM-DD');
        const todayStats = this.stats.dailyStats[today] || {
            activeUsers: new Set(),
            activeGroups: new Set()
        };
        
        // Get top commands
        const topCommands = Object.entries(this.stats.commandUsage)
            .filter(([key]) => !key.startsWith('fun_') && key !== 'errors')
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 5)
            .map(([cmd, stats]) => ({
                command: cmd,
                count: stats.count,
                uniqueUsers: stats.users?.size || 0,
                successRate: stats.successes ? ((stats.successes / stats.count) * 100).toFixed(1) : '100.0'
            }));
        
        // Get fun command stats
        const funCommands = Object.entries(this.stats.commandUsage)
            .filter(([key]) => key.startsWith('fun_'))
            .map(([key, stats]) => ({
                type: key.replace('fun_', ''),
                count: stats.count,
                uniqueThreads: stats.threads?.size || 0
            }));
        
        // Calculate message success rate
        const totalMessages = this.stats.messagesSent + this.stats.messagesReceived;
        const messageSuccessRate = totalMessages > 0 ? 
            ((this.stats.messagesSent / totalMessages) * 100).toFixed(1) : '0.0';
        
        return {
            general: {
                uptime: {
                    days: uptime.days(),
                    hours: uptime.hours(),
                    minutes: uptine.minutes(),
                    seconds: uptime.seconds()
                },
                startTime: this.stats.startTime,
                messages: {
                    sent: this.stats.messagesSent,
                    received: this.stats.messagesReceived,
                    total: totalMessages,
                    successRate: `${messageSuccessRate}%`
                },
                commands: {
                    executed: this.stats.commandsExecuted,
                    funExecuted: this.stats.funCommandsExecuted
                },
                errors: this.stats.errors,
                users: {
                    total: this.stats.users.size,
                    activeToday: todayStats.activeUsers.size
                },
                groups: {
                    total: this.stats.groups.size,
                    activeToday: todayStats.activeGroups.size
                }
            },
            commands: {
                top: topCommands,
                fun: funCommands,
                totalUnique: Object.keys(this.stats.commandUsage).length
            },
            daily: {
                today: todayStats,
                last7Days: this.getLastNDays(7)
            }
        };
    }

    getLastNDays(days) {
        const result = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = moment().subtract(i, 'days').format('YYYY-MM-DD');
            const stats = this.stats.dailyStats[date] || {
                messagesSent: 0,
                messagesReceived: 0,
                commandsExecuted: 0,
                funCommandsExecuted: 0,
                errors: 0,
                activeUsers: new Set(),
                activeGroups: new Set()
            };
            
            result.push({
                date,
                messagesSent: stats.messagesSent,
                messagesReceived: stats.messagesReceived,
                commandsExecuted: stats.commandsExecuted,
                funCommandsExecuted: stats.funCommandsExecuted,
                errors: stats.errors,
                activeUsers: stats.activeUsers?.size || 0,
                activeGroups: stats.activeGroups?.size || 0
            });
        }
        return result;
    }

    getHourlyStats(hours = 24) {
        const result = [];
        for (let i = hours - 1; i >= 0; i--) {
            const hour = moment().subtract(i, 'hours').format('YYYY-MM-DD HH:00');
            const stats = this.stats.hourlyStats[hour] || {
                messagesSent: 0,
                messagesReceived: 0,
                commandsExecuted: 0
            };
            
            result.push({
                hour,
                ...stats
            });
        }
        return result;
    }

    // Reset stats (owner only)
    reset() {
        this.stats = {
            startTime: new Date().toISOString(),
            messagesSent: 0,
            messagesReceived: 0,
            commandsExecuted: 0,
            funCommandsExecuted: 0,
            errors: 0,
            uptime: 0,
            users: new Set(),
            groups: new Set(),
            commandUsage: {},
            dailyStats: {},
            hourlyStats: {}
        };
        
        this.save();
        logger.info('Statistics reset');
    }

    // Export stats to file
    async exportToFile(format = 'json') {
        try {
            const exportData = this.getStats();
            const timestamp = moment().format('YYYYMMDD_HHmmss');
            const exportDir = path.join(__dirname, '../../data/exports');
            
            await fs.ensureDir(exportDir);
            
            let filePath, content;
            
            switch (format) {
                case 'json':
                    filePath = path.join(exportDir, `stats_${timestamp}.json`);
                    content = JSON.stringify(exportData, null, 2);
                    break;
                    
                case 'txt':
                    filePath = path.join(exportDir, `stats_${timestamp}.txt`);
                    content = this.formatAsText(exportData);
                    break;
                    
                default:
                    throw new Error('Unsupported export format');
            }
            
            await fs.writeFile(filePath, content);
            logger.success(`Stats exported to ${filePath}`);
            
            return filePath;
        } catch (error) {
            logger.error('Failed to export stats:', error);
            return null;
        }
    }

    formatAsText(data) {
        let text = '🤖 YOUR CRUSH BOT - STATISTICS REPORT\n';
        text += '══════════════════════════════════════════\n\n';
        
        // General stats
        text += '📊 GENERAL STATISTICS:\n';
        text += `⏰ Uptime: ${data.general.uptime.days}d ${data.general.uptime.hours}h ${data.general.uptime.minutes}m\n`;
        text += `📅 Started: ${moment(data.general.startTime).format('YYYY-MM-DD HH:mm:ss')}\n\n`;
        
        text += '💬 MESSAGES:\n';
        text += `  Sent: ${data.general.messages.sent}\n`;
        text += `  Received: ${data.general.messages.received}\n`;
        text += `  Total: ${data.general.messages.total}\n`;
        text += `  Success Rate: ${data.general.messages.successRate}\n\n`;
        
        text += '⚡ COMMANDS:\n';
        text += `  Executed: ${data.general.commands.executed}\n`;
        text += `  Fun Commands: ${data.general.commands.funExecuted}\n\n`;
        
        text += '👥 USERS & GROUPS:\n';
        text += `  Total Users: ${data.general.users.total}\n`;
        text += `  Active Today: ${data.general.users.activeToday}\n`;
        text += `  Total Groups: ${data.general.groups.total}\n`;
        text += `  Active Today: ${data.general.groups.activeToday}\n\n`;
        
        text += '❌ ERRORS: ' + data.general.errors + '\n\n';
        
        // Top commands
        if (data.commands.top.length > 0) {
            text += '🏆 TOP 5 COMMANDS:\n';
            data.commands.top.forEach((cmd, i) => {
                text += `  ${i + 1}. ${cmd.command}: ${cmd.count} times (${cmd.successRate}% success)\n`;
            });
            text += '\n';
        }
        
        // Fun commands
        if (data.commands.fun.length > 0) {
            text += '🎮 FUN COMMANDS:\n';
            data.commands.fun.forEach(cmd => {
                text += `  ${cmd.type}: ${cmd.count} times in ${cmd.uniqueThreads} threads\n`;
            });
            text += '\n';
        }
        
        text += '══════════════════════════════════════════\n';
        text += `Report generated: ${moment().format('YYYY-MM-DD HH:mm:ss')}\n`;
        text += '🤖 YOUR CRUSH BOT - RANA (MASTER 🪓)\n';
        
        return text;
    }

    // Cleanup old stats
    async cleanupOldStats(daysToKeep = 30) {
        try {
            const cutoff = moment().subtract(daysToKeep, 'days');
            
            // Clean daily stats
            for (const date in this.stats.dailyStats) {
                if (moment(date, 'YYYY-MM-DD').isBefore(cutoff)) {
                    delete this.stats.dailyStats[date];
                }
            }
            
            // Clean hourly stats (keep 7 days)
            const hourlyCutoff = moment().subtract(7, 'days');
            for (const hour in this.stats.hourlyStats) {
                if (moment(hour, 'YYYY-MM-DD HH:00').isBefore(hourlyCutoff)) {
                    delete this.stats.hourlyStats[hour];
                }
            }
            
            await this.save();
            logger.info(`Cleaned up stats older than ${daysToKeep} days`);
        } catch (error) {
            logger.error('Failed to cleanup old stats:', error);
        }
    }
}

module.exports = new StatsManager();