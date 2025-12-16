const settings = require('../../config/settings.json');

class DelayManager {
    constructor() {
        this.minDelay = settings.delay?.min || 300; // 0.3 seconds
        this.maxDelay = settings.delay?.max || 600; // 0.6 seconds
        this.commandDelays = new Map(); // userID -> last command time
        this.globalDelay = 0;
    }

    getRandomDelay() {
        return Math.floor(Math.random() * (this.maxDelay - this.minDelay + 1)) + this.minDelay;
    }

    getFastDelay() {
        return Math.floor(this.minDelay * 0.5); // Half of minimum delay
    }

    getSlowDelay() {
        return Math.floor(this.maxDelay * 1.5); // 1.5x of maximum delay
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async humanDelay() {
        const delay = this.getRandomDelay();
        await this.sleep(delay);
        return delay;
    }

    async fastDelay() {
        const delay = this.getFastDelay();
        await this.sleep(delay);
        return delay;
    }

    async slowDelay() {
        const delay = this.getSlowDelay();
        await this.sleep(delay);
        return delay;
    }

    async rateLimit(userID, command) {
        const now = Date.now();
        const key = `${userID}_${command}`;
        
        if (this.commandDelays.has(key)) {
            const lastTime = this.commandDelays.get(key);
            const timeDiff = now - lastTime;
            
            // Minimum 1 second between same commands from same user
            if (timeDiff < 1000) {
                const waitTime = 1000 - timeDiff;
                await this.sleep(waitTime);
            }
        }
        
        this.commandDelays.set(key, now);
        
        // Clean old entries (older than 5 minutes)
        this.cleanOldEntries();
    }

    cleanOldEntries() {
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        
        for (const [key, timestamp] of this.commandDelays.entries()) {
            if (now - timestamp > fiveMinutes) {
                this.commandDelays.delete(key);
            }
        }
    }

    async sequentialDelay(baseDelay = null) {
        const delay = baseDelay || this.getRandomDelay();
        
        // Add global delay accumulation
        this.globalDelay += delay * 0.1; // 10% accumulation
        
        const totalDelay = delay + this.globalDelay;
        await this.sleep(totalDelay);
        
        // Gradually reduce global delay
        this.globalDelay = Math.max(0, this.globalDelay - (delay * 0.05));
        
        return totalDelay;
    }

    async burstDelay(count, baseDelay = null) {
        const delays = [];
        for (let i = 0; i < count; i++) {
            const delay = baseDelay || this.getRandomDelay();
            
            // First message faster, then normal
            const actualDelay = i === 0 ? delay * 0.7 : delay;
            
            await this.sleep(actualDelay);
            delays.push(actualDelay);
        }
        return delays;
    }

    async typingDelay(api, threadID, duration = 1000) {
        try {
            api.sendTypingIndicator(threadID);
            await this.sleep(duration);
            api.sendTypingIndicator(threadID, false);
        } catch (error) {
            console.error('Typing indicator error:', error);
        }
    }

    getDelayStats() {
        return {
            minDelay: this.minDelay,
            maxDelay: this.maxDelay,
            globalDelay: this.globalDelay,
            activeUsers: this.commandDelays.size,
            averageDelay: (this.minDelay + this.maxDelay) / 2
        };
    }

    reset() {
        this.commandDelays.clear();
        this.globalDelay = 0;
        console.log('✅ Delay manager reset');
    }

    // For fun commands - special delay pattern
    async funDelay(iteration) {
        // Vary delay based on iteration to make it less predictable
        const base = this.getRandomDelay();
        
        if (iteration % 10 === 0) {
            // Every 10th message, slightly longer delay
            return base * 1.3;
        } else if (iteration % 5 === 0) {
            // Every 5th message, slightly shorter delay
            return base * 0.8;
        } else if (iteration % 3 === 0) {
            // Every 3rd message, add small random variation
            return base + (Math.random() * 100 - 50);
        }
        
        return base;
    }
}

module.exports = new DelayManager();