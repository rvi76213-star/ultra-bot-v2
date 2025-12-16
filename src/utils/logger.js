const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');
const chalk = require('chalk');

class Logger {
    constructor() {
        this.logDir = path.join(__dirname, '../../data/logs');
        this.currentLogFile = null;
        this.init();
    }

    async init() {
        await fs.ensureDir(this.logDir);
        this.currentLogFile = path.join(this.logDir, `bot-${moment().format('YYYY-MM-DD')}.log`);
    }

    getTimestamp() {
        return moment().format('YYYY-MM-DD HH:mm:ss');
    }

    async writeToFile(level, message) {
        try {
            const logEntry = `[${this.getTimestamp()}] [${level.toUpperCase()}] ${message}\n`;
            await fs.appendFile(this.currentLogFile, logEntry);
        } catch (error) {
            console.error('Failed to write log:', error);
        }
    }

    log(level, message, ...args) {
        const timestamp = this.getTimestamp();
        const formattedMessage = typeof message === 'string' ? message : JSON.stringify(message);
        const fullMessage = `${formattedMessage} ${args.map(arg => 
            typeof arg === 'string' ? arg : JSON.stringify(arg)
        ).join(' ')}`;

        // Console output with colors
        const levelColors = {
            info: chalk.blue,
            warn: chalk.yellow,
            error: chalk.red,
            debug: chalk.gray,
            success: chalk.green
        };

        const color = levelColors[level] || chalk.white;
        console.log(color(`[${timestamp}] [${level.toUpperCase()}] ${fullMessage}`));

        // Write to file
        this.writeToFile(level, fullMessage);
    }

    info(message, ...args) {
        this.log('info', message, ...args);
    }

    warn(message, ...args) {
        this.log('warn', message, ...args);
    }

    error(message, ...args) {
        this.log('error', message, ...args);
    }

    debug(message, ...args) {
        this.log('debug', message, ...args);
    }

    success(message, ...args) {
        this.log('success', message, ...args);
    }

    async getLogs(limit = 100) {
        try {
            const files = await fs.readdir(this.logDir);
            const logFiles = files.filter(f => f.endsWith('.log')).sort().reverse();
            
            let allLogs = [];
            for (const file of logFiles.slice(0, 3)) { // Last 3 days
                const filePath = path.join(this.logDir, file);
                const content = await fs.readFile(filePath, 'utf8');
                const lines = content.split('\n').filter(line => line.trim());
                allLogs = [...allLogs, ...lines];
            }
            
            return allLogs.slice(-limit);
        } catch (error) {
            this.error('Failed to read logs:', error);
            return [];
        }
    }

    async clearOldLogs(daysToKeep = 7) {
        try {
            const files = await fs.readdir(this.logDir);
            const cutoffDate = moment().subtract(daysToKeep, 'days');
            
            for (const file of files) {
                if (file.endsWith('.log')) {
                    const dateMatch = file.match(/bot-(\d{4}-\d{2}-\d{2})\.log/);
                    if (dateMatch) {
                        const fileDate = moment(dateMatch[1], 'YYYY-MM-DD');
                        if (fileDate.isBefore(cutoffDate)) {
                            const filePath = path.join(this.logDir, file);
                            await fs.unlink(filePath);
                            this.info(`Deleted old log file: ${file}`);
                        }
                    }
                }
            }
        } catch (error) {
            this.error('Failed to clear old logs:', error);
        }
    }
}

module.exports = new Logger();