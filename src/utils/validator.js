const fs = require('fs-extra');
const path = require('path');

class Validator {
    constructor() {
        this.regexPatterns = {
            facebookID: /^\d{10,20}$/,
            threadID: /^\d{10,20}$|^\d{10,20}@thread\.skim$/,
            url: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            phone: /^[\+]?[0-9]{10,15}$/,
            filename: /^[a-zA-Z0-9_\-. ]+$/,
            command: /^[a-zA-Z0-9_]+$/
        };

        this.allowedImageTypes = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
    }

    // Validate Facebook ID
    isValidFacebookID(id) {
        if (!id || typeof id !== 'string') return false;
        return this.regexPatterns.facebookID.test(id);
    }

    // Validate Thread ID
    isValidThreadID(threadID) {
        if (!threadID || typeof threadID !== 'string') return false;
        return this.regexPatterns.threadID.test(threadID);
    }

    // Validate URL
    isValidURL(url) {
        if (!url || typeof url !== 'string') return false;
        return this.regexPatterns.url.test(url);
    }

    // Validate email
    isValidEmail(email) {
        if (!email || typeof email !== 'string') return false;
        return this.regexPatterns.email.test(email);
    }

    // Validate phone number
    isValidPhone(phone) {
        if (!phone || typeof phone !== 'string') return false;
        return this.regexPatterns.phone.test(phone);
    }

    // Validate filename
    isValidFilename(filename) {
        if (!filename || typeof filename !== 'string') return false;
        if (filename.length > 255) return false;
        return this.regexPatterns.filename.test(filename);
    }

    // Validate command name
    isValidCommand(command) {
        if (!command || typeof command !== 'string') return false;
        if (command.length > 50) return false;
        return this.regexPatterns.command.test(command);
    }

    // Validate image file
    async isValidImage(filePath) {
        try {
            // Check if file exists
            const exists = await fs.pathExists(filePath);
            if (!exists) return { valid: false, error: 'File does not exist' };

            // Check file size
            const stats = await fs.stat(filePath);
            if (stats.size > this.maxFileSize) {
                return { valid: false, error: 'File too large (max 10MB)' };
            }

            // Check file extension
            const ext = path.extname(filePath).toLowerCase();
            if (!this.allowedImageTypes.includes(ext)) {
                return { valid: false, error: 'Invalid file type. Allowed: PNG, JPG, JPEG, GIF, WEBP' };
            }

            // Check if it's actually an image by reading first few bytes
            const buffer = Buffer.alloc(4);
            const fd = await fs.open(filePath, 'r');
            await fs.read(fd, buffer, 0, 4, 0);
            await fs.close(fd);

            // Check magic numbers for common image formats
            const magic = buffer.toString('hex').toUpperCase();
            const validMagicNumbers = [
                '89504E47', // PNG
                'FFD8FF',   // JPEG
                '47494638', // GIF
                '52494646'  // WEBP
            ];

            const isValid = validMagicNumbers.some(magicNum => 
                magic.startsWith(magicNum)
            );

            if (!isValid) {
                return { valid: false, error: 'File is not a valid image' };
            }

            return { valid: true, size: stats.size, extension: ext };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    // Validate JSON file
    async isValidJSON(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            JSON.parse(content);
            return { valid: true };
        } catch (error) {
            return { valid: false, error: 'Invalid JSON format' };
        }
    }

    // Validate appstate.json
    async isValidAppState(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            const appState = JSON.parse(content);
            
            if (!Array.isArray(appState)) {
                return { valid: false, error: 'AppState must be an array' };
            }

            if (appState.length === 0) {
                return { valid: false, error: 'AppState array is empty' };
            }

            // Check for required fields in first object
            const firstItem = appState[0];
            if (!firstItem.key || !firstItem.value || !firstItem.domain || !firstItem.path) {
                return { valid: false, error: 'Invalid AppState structure' };
            }

            return { valid: true, count: appState.length };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    // Validate user input for command arguments
    validateArgs(args, rules) {
        const errors = [];
        const validated = {};

        for (const rule of rules) {
            const { name, required, type, min, max, pattern, options } = rule;
            const value = args[rule.index];

            // Check if required
            if (required && (value === undefined || value === null || value === '')) {
                errors.push(`${name} is required`);
                continue;
            }

            // Skip validation if not required and empty
            if (!required && (value === undefined || value === null || value === '')) {
                validated[name] = value;
                continue;
            }

            // Type validation
            switch (type) {
                case 'string':
                    if (typeof value !== 'string') {
                        errors.push(`${name} must be a string`);
                        continue;
                    }
                    if (min && value.length < min) {
                        errors.push(`${name} must be at least ${min} characters`);
                    }
                    if (max && value.length > max) {
                        errors.push(`${name} must be at most ${max} characters`);
                    }
                    if (pattern && !pattern.test(value)) {
                        errors.push(`${name} has invalid format`);
                    }
                    validated[name] = value.trim();
                    break;

                case 'number':
                    const num = Number(value);
                    if (isNaN(num)) {
                        errors.push(`${name} must be a number`);
                        continue;
                    }
                    if (min && num < min) {
                        errors.push(`${name} must be at least ${min}`);
                    }
                    if (max && num > max) {
                        errors.push(`${name} must be at most ${max}`);
                    }
                    validated[name] = num;
                    break;

                case 'boolean':
                    if (typeof value === 'string') {
                        const lowerValue = value.toLowerCase();
                        validated[name] = lowerValue === 'true' || lowerValue === 'yes' || lowerValue === '1';
                    } else {
                        validated[name] = Boolean(value);
                    }
                    break;

                case 'enum':
                    if (!options.includes(value)) {
                        errors.push(`${name} must be one of: ${options.join(', ')}`);
                        continue;
                    }
                    validated[name] = value;
                    break;

                case 'array':
                    if (!Array.isArray(value)) {
                        errors.push(`${name} must be an array`);
                        continue;
                    }
                    validated[name] = value;
                    break;

                default:
                    validated[name] = value;
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            data: validated
        };
    }

    // Sanitize input
    sanitize(input) {
        if (typeof input !== 'string') return input;
        
        // Remove potentially dangerous characters
        return input
            .replace(/[<>]/g, '') // Remove < and >
            .replace(/javascript:/gi, '') // Remove javascript:
            .replace(/on\w+=/gi, '') // Remove event handlers
            .trim();
    }

    // Check if user has permission
    hasPermission(userRole, requiredRole) {
        const roleHierarchy = {
            'user': 1,
            'admin': 2,
            'owner': 3
        };

        return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
    }

    // Validate configuration
    validateConfig(config) {
        const errors = [];
        const warnings = [];

        // Check required fields
        if (!config.prefix || config.prefix.length !== 1) {
            errors.push('Prefix must be a single character');
        }

        if (!Array.isArray(config.admins)) {
            errors.push('Admins must be an array');
        } else {
            config.admins.forEach((admin, index) => {
                if (!this.isValidFacebookID(admin)) {
                    errors.push(`Admin at index ${index} has invalid Facebook ID: ${admin}`);
                }
            });
        }

        if (typeof config.autoAddFriend !== 'boolean') {
            warnings.push('autoAddFriend should be boolean');
        }

        if (typeof config.autoShare !== 'boolean') {
            warnings.push('autoShare should be boolean');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    // Clean cache
    cleanCache(cache, maxAge = 3600000) {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, entry] of cache.entries()) {
            if (now - entry.timestamp > maxAge) {
                cache.delete(key);
                cleaned++;
            }
        }

        return cleaned;
    }
}

module.exports = new Validator();