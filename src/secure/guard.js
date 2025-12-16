const config = require('../../config/config.json');
const ownerVerifier = require('./verifyOwner');
const logger = require('../utils/logger');

class SecurityGuard {
    constructor() {
        this.roleHierarchy = {
            'user': 1,
            'admin': 2,
            'owner': 3
        };

        this.commandPermissions = {
            // Normal commands - everyone can use
            'help': ['user', 'admin', 'owner'],
            'info': ['user', 'admin', 'owner'],
            'ping': ['user', 'admin', 'owner'],

            // Admin commands
            'startfun': ['admin', 'owner'],
            'stopfun': ['admin', 'owner'],
            'stats': ['admin', 'owner'],
            'groups': ['admin', 'owner'],
            'adminphoto': ['admin', 'owner'],
            'funjson': ['admin', 'owner'],
            'prefix': ['admin', 'owner'],

            // Owner commands
            'owner': ['owner'],
            'addadmin': ['owner'],
            'removeadmin': ['owner'],
            'emergency': ['owner'],
            'system': ['owner']
        };

        this.rateLimits = new Map();
        this.blockedUsers = new Set();
        this.suspiciousActivities = new Map();
    }

    getRole(userID, ownerUID, admins) {
        // First check if owner
        if (ownerVerifier.isOwner(userID)) {
            return 'owner';
        }

        // Then check if admin
        if (Array.isArray(admins) && admins.includes(userID.toString())) {
            return 'admin';
        }

        // Otherwise user
        return 'user';
    }

    hasPermission(userRole, command) {
        if (!this.commandPermissions[command]) {
            logger.warn(`Unknown command permissions: ${command}`);
            return userRole === 'owner'; // Only owner can use unknown commands
        }

        return this.commandPermissions[command].includes(userRole);
    }

    canUseFun(userID, ownerUID, admins) {
        const role = this.getRole(userID, ownerUID, admins);
        return role === 'admin' || role === 'owner';
    }

    isOwner(userID) {
        return ownerVerifier.isOwner(userID);
    }

    isAdmin(userID, admins) {
        if (this.isOwner(userID)) return true;
        return Array.isArray(admins) && admins.includes(userID.toString());
    }

    checkRateLimit(userID, command) {
        const now = Date.now();
        const key = `${userID}_${command}`;
        const window = 60000; // 1 minute window

        if (!this.rateLimits.has(key)) {
            this.rateLimits.set(key, []);
        }

        const timestamps = this.rateLimits.get(key);
        
        // Remove timestamps outside the window
        while (timestamps.length > 0 && now - timestamps[0] > window) {
            timestamps.shift();
        }

        // Check if limit exceeded (max 10 commands per minute)
        if (timestamps.length >= 10) {
            // Log suspicious activity
            this.logSuspiciousActivity(userID, 'rate_limit_exceeded', {
                command: command,
                count: timestamps.length,
                window: window
            });

            return {
                allowed: false,
                retryAfter: Math.ceil((timestamps[0] + window - now) / 1000),
                message: 'Rate limit exceeded. Please wait.'
            };
        }

        // Add current timestamp
        timestamps.push(now);
        this.rateLimits.set(key, timestamps);

        return {
            allowed: true,
            remaining: 10 - timestamps.length,
            resetIn: window
        };
    }

    logSuspiciousActivity(userID, type, data = {}) {
        const key = `${userID}_${type}`;
        const now = Date.now();
        const window = 3600000; // 1 hour

        if (!this.suspiciousActivities.has(key)) {
            this.suspiciousActivities.set(key, []);
        }

        const activities = this.suspiciousActivities.get(key);
        
        // Remove old activities
        while (activities.length > 0 && now - activities[0].timestamp > window) {
            activities.shift();
        }

        // Add new activity
        activities.push({
            timestamp: now,
            type: type,
            data: data
        });

        this.suspiciousActivities.set(key, activities);

        // Check if user should be blocked (3+ suspicious activities in 1 hour)
        if (activities.length >= 3) {
            this.blockUser(userID, `Multiple suspicious activities: ${type}`);
            logger.warn(`User ${userID} blocked due to suspicious activities`);
        }

        logger.warn(`Suspicious activity: ${userID} - ${type}`, data);
    }

    blockUser(userID, reason = 'Security violation') {
        this.blockedUsers.add(userID.toString());
        logger.warn(`User ${userID} blocked: ${reason}`);

        // Log to file
        const logEntry = {
            timestamp: new Date().toISOString(),
            userID: userID,
            action: 'BLOCKED',
            reason: reason,
            blockedBy: 'SecurityGuard'
        };

        // You could save this to a file or database
        // fs.appendFileSync('security.log', JSON.stringify(logEntry) + '\n');
    }

    unblockUser(userID) {
        this.blockedUsers.delete(userID.toString());
        logger.info(`User ${userID} unblocked`);
    }

    isBlocked(userID) {
        return this.blockedUsers.has(userID.toString());
    }

    validateInput(input, type = 'text') {
        if (typeof input !== 'string') return false;

        switch (type) {
            case 'command':
                // Command should be alphanumeric with underscores
                return /^[a-zA-Z0-9_]+$/.test(input) && input.length <= 50;

            case 'argument':
                // Arguments should have reasonable length
                return input.length <= 500;

            case 'userID':
                // User ID should be numeric
                return /^\d+$/.test(input) && input.length >= 10 && input.length <= 20;

            case 'threadID':
                // Thread ID can be numeric or with @thread.skim
                return /^(\d+|[\d@\._]+)$/.test(input);

            case 'url':
                // Simple URL validation
                try {
                    new URL(input);
                    return true;
                } catch {
                    return false;
                }

            default:
                return input.length <= 1000; // General length limit
        }
    }

    sanitizeMessage(message) {
        if (typeof message !== 'string') return '';

        // Remove potential injection attacks
        return message
            .replace(/[<>]/g, '') // Remove < and >
            .replace(/javascript:/gi, '') // Remove javascript:
            .replace(/on\w+=/gi, '') // Remove event handlers
            .replace(/data:/gi, '') // Remove data URLs
            .replace(/[\u200B-\u200F\u202A-\u202E]/g, '') // Remove invisible characters
            .trim()
            .substring(0, 2000); // Limit length
    }

    validateConfig(config) {
        const errors = [];

        if (!config.prefix || typeof config.prefix !== 'string' || config.prefix.length !== 1) {
            errors.push('Prefix must be a single character string');
        }

        if (!Array.isArray(config.admins)) {
            errors.push('Admins must be an array');
        } else {
            config.admins.forEach((admin, index) => {
                if (!this.validateInput(admin.toString(), 'userID')) {
                    errors.push(`Invalid admin ID at index ${index}: ${admin}`);
                }
            });
        }

        if (typeof config.autoAddFriend !== 'boolean') {
            errors.push('autoAddFriend must be boolean');
        }

        if (typeof config.autoShare !== 'boolean') {
            errors.push('autoShare must be boolean');
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    checkCommandSafety(command, args, userID, threadID) {
        const safetyChecks = {
            safe: true,
            warnings: [],
            blocks: []
        };

        // Check for dangerous patterns
        const dangerousPatterns = [
            { pattern: /eval\(/gi, reason: 'eval usage' },
            { pattern: /require\(/gi, reason: 'require usage' },
            { pattern: /process\./gi, reason: 'process access' },
            { pattern: /fs\./gi, reason: 'file system access' },
            { pattern: /child_process/gi, reason: 'child process' },
            { pattern: /exec\(/gi, reason: 'command execution' },
            { pattern: /spawn\(/gi, reason: 'process spawn' }
        ];

        const fullCommand = command + ' ' + args.join(' ');
        
        dangerousPatterns.forEach(({ pattern, reason }) => {
            if (pattern.test(fullCommand)) {
                safetyChecks.warnings.push(`Potential ${reason} detected`);
                this.logSuspiciousActivity(userID, 'dangerous_pattern', {
                    pattern: reason,
                    command: fullCommand
                });
            }
        });

        // Check for injection attempts
        if (fullCommand.includes(';') || fullCommand.includes('|') || fullCommand.includes('&')) {
            safetyChecks.warnings.push('Potential command injection detected');
            this.logSuspiciousActivity(userID, 'command_injection', {
                command: fullCommand
            });
        }

        // Check for excessive length
        if (fullCommand.length > 500) {
            safetyChecks.blocks.push('Command too long');
            safetyChecks.safe = false;
        }

        // Check if user is blocked
        if (this.isBlocked(userID)) {
            safetyChecks.blocks.push('User is blocked');
            safetyChecks.safe = false;
        }

        return safetyChecks;
    }

    getSecurityStatus() {
        return {
            blockedUsers: this.blockedUsers.size,
            rateLimitedCommands: this.rateLimits.size,
            suspiciousActivities: Array.from(this.suspiciousActivities.values())
                .reduce((total, activities) => total + activities.length, 0),
            roleHierarchy: this.roleHierarchy,
            commandPermissions: Object.keys(this.commandPermissions).length
        };
    }

    cleanupOldData() {
        const now = Date.now();
        const oneHour = 3600000;
        const oneDay = 86400000;

        // Clean rate limits (older than 1 hour)
        for (const [key, timestamps] of this.rateLimits.entries()) {
            const recentTimestamps = timestamps.filter(ts => now - ts < oneHour);
            if (recentTimestamps.length === 0) {
                this.rateLimits.delete(key);
            } else {
                this.rateLimits.set(key, recentTimestamps);
            }
        }

        // Clean suspicious activities (older than 1 day)
        for (const [key, activities] of this.suspiciousActivities.entries()) {
            const recentActivities = activities.filter(act => now - act.timestamp < oneDay);
            if (recentActivities.length === 0) {
                this.suspiciousActivities.delete(key);
            } else {
                this.suspiciousActivities.set(key, recentActivities);
            }
        }

        logger.debug('Security guard data cleaned up');
    }

    emergencyLockdown(reason = 'Security emergency') {
        logger.emergency(`SECURITY LOCKDOWN: ${reason}`);
        
        // Block all non-owner users
        this.blockedUsers.clear(); // Clear existing blocks
        
        // Add emergency message
        const emergencyMessage = `🚨 **SECURITY LOCKDOWN ACTIVATED** 🚨\n` +
            `Reason: ${reason}\n` +
            `Only bot owner can use commands until lockdown is lifted.`;
        
        return {
            lockdown: true,
            reason: reason,
            timestamp: new Date().toISOString(),
            message: emergencyMessage
        };
    }

    liftLockdown() {
        this.blockedUsers.clear();
        logger.info('Security lockdown lifted');
        
        return {
            lockdown: false,
            timestamp: new Date().toISOString(),
            message: 'Security lockdown lifted'
        };
    }
}

module.exports = new SecurityGuard();