const fs = require('fs-extra');
const path = require('path');
const login = require('facebook-chat-api');
const chalk = require('chalk');
const moment = require('moment');

// Load configurations
const config = require('../config/config.json');
const settings = require('../config/settings.json');

// Load utils
const logger = require('./utils/logger');
const guard = require('./secure/guard');
const photoManager = require('./utils/photo');
const delayManager = require('./utils/delay');

// Load commands
const helpCommand = require('./commands/normal/help');
const infoCommand = require('./commands/normal/info');
const statsCommand = require('./commands/normal/stats');
const startFun = require('./commands/admin/startFun');
const stopFun = require('./commands/admin/stopFun');
const manageGroups = require('./commands/admin/manageGroups');
const editAdminPhoto = require('./commands/admin/editAdminPhoto');
const updateFunJSON = require('./commands/admin/updateFunJSON');

class MessengerBot {
    constructor() {
        this.api = null;
        this.currentUser = null;
        this.isRunning = false;
        this.funActive = false;
        this.funThreads = new Map(); // threadID -> {type, index, interval}
        this.ownerUID = "61578706761898";
        this.prefix = config.prefix || "!";
        this.admins = config.admins || [];
        this.commandHistory = [];
        this.startTime = new Date();
        
        this.initialize();
    }

    async initialize() {
        console.log(chalk.cyan.bold("\n" + "=".repeat(50)));
        console.log(chalk.cyan.bold("🤖 YOUR CRUSH BOT - STARTING"));
        console.log(chalk.cyan.bold("👑 Developer: RANA (MASTER 🪓)"));
        console.log(chalk.cyan.bold("📍 Faridpur, Dhaka, Bangladesh"));
        console.log(chalk.cyan.bold("=".repeat(50) + "\n"));

        try {
            // Check if appstate exists
            const appstatePath = path.join(__dirname, 'secure', 'appstate.json');
            if (!fs.existsSync(appstatePath)) {
                console.log(chalk.red("❌ appstate.json not found!"));
                console.log(chalk.yellow("ℹ️ Please run: npm run login"));
                process.exit(1);
            }

            const appstate = JSON.parse(fs.readFileSync(appstatePath, 'utf8'));
            
            console.log(chalk.yellow("🔐 Logging in with appstate..."));
            
            // Login with appstate
            login({ appState: appstate }, (err, api) => {
                if (err) {
                    console.log(chalk.red("❌ Login failed:"), err.error);
                    
                    if (err.error === 'Error retrieving userID. This can be caused by a lot of things, including getting blocked by Facebook for logging in from an unknown location. Try logging in with a browser to verify your account.') {
                        console.log(chalk.yellow("\n⚠️ Facebook may have blocked the login."));
                        console.log(chalk.yellow("ℹ️ Try:"));
                        console.log(chalk.yellow("   1. Login to Facebook in browser"));
                        console.log(chalk.yellow("   2. Verify your account"));
                        console.log(chalk.yellow("   3. Remove appstate.json and run npm run login again"));
                    }
                    
                    process.exit(1);
                }

                this.api = api;
                this.api.setOptions({
                    listenEvents: true,
                    selfListen: false,
                    forceLogin: true,
                    logLevel: 'silent',
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                });

                // Get current user info
                this.api.getCurrentUserID((err, userID) => {
                    if (err) {
                        console.log(chalk.red("❌ Failed to get user ID:"), err);
                        return;
                    }
                    
                    this.currentUser = userID;
                    console.log(chalk.green(`✅ Logged in as: ${userID}`));
                    
                    // Get user info
                    this.api.getUserInfo(userID, (err, ret) => {
                        if (!err && ret[userID]) {
                            const user = ret[userID];
                            console.log(chalk.cyan(`👤 Name: ${user.name}`));
                            console.log(chalk.cyan(`📧 Profile: ${user.profileUrl || 'N/A'}`));
                        }
                        
                        // Start listening
                        this.startListening();
                    });
                });

                // Handle errors
                this.api.listenMqtt((err, event) => {
                    if (err) {
                        logger.error("MQTT Error:", err);
                    }
                });

            });

        } catch (error) {
            logger.error("Initialization Error:", error);
            process.exit(1);
        }
    }

    startListening() {
        console.log(chalk.yellow("\n👂 Listening for messages..."));
        
        this.api.listen((err, event) => {
            if (err) {
                logger.error("Listen Error:", err);
                
                // Try to reconnect
                if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
                    console.log(chalk.yellow("⚠️ Connection lost, attempting to reconnect..."));
                    setTimeout(() => {
                        this.api = null;
                        this.initialize();
                    }, 5000);
                }
                return;
            }

            this.handleEvent(event);
        });

        console.log(chalk.green.bold("✅ Bot is now active and ready!"));
        console.log(chalk.cyan("ℹ️ Type !help for commands"));
        console.log(chalk.cyan("=".repeat(50)));
        
        this.isRunning = true;
        
        // Mark as started
        this.onBotStarted();
    }

    async onBotStarted() {
        // Send startup notification if configured
        if (settings.features.startupNotification) {
            const ownerPhoto = photoManager.getRandomOwnerPhoto();
            const message = `🤖 YOUR CRUSH BOT started successfully!\n` +
                          `⏰ Time: ${moment().format('YYYY-MM-DD HH:mm:ss')}\n` +
                          `👑 Owner: RANA (MASTER 🪓)\n` +
                          `⚡ Version: 2.0`;
            
            // You can send to specific thread or owner here
            // this.api.sendMessage({body: message, attachment: photo}, threadID);
        }
    }

    async handleEvent(event) {
        try {
            // Log event type
            logger.debug(`Event type: ${event.type}`, event);
            
            switch (event.type) {
                case 'message':
                    await this.handleMessage(event);
                    break;
                    
                case 'event':
                    await this.handleEventNotification(event);
                    break;
                    
                case 'typ':
                    // Someone is typing
                    break;
                    
                case 'read_receipt':
                    // Message read receipt
                    break;
                    
                case 'message_reply':
                    await this.handleMessageReply(event);
                    break;
                    
                default:
                    logger.debug(`Unhandled event type: ${event.type}`);
            }
        } catch (error) {
            logger.error("Event Handling Error:", error);
        }
    }

    async handleMessage(event) {
        const { body, senderID, threadID, messageID } = event;
        
        // Ignore own messages
        if (senderID === this.currentUser) return;
        
        // Log message
        logger.info(`Message from ${senderID}: ${body ? body.substring(0, 50) : '(no body)'}`);
        
        // Check if message starts with prefix
        if (body && body.startsWith(this.prefix)) {
            const args = body.slice(this.prefix.length).trim().split(/ +/);
            const command = args.shift().toLowerCase();
            
            // Check permissions
            const userRole = guard.getRole(senderID, this.ownerUID, this.admins);
            
            // Add to command history
            this.commandHistory.push({
                time: new Date(),
                userID: senderID,
                command: command,
                threadID: threadID,
                role: userRole
            });
            
            // Keep only last 100 commands
            if (this.commandHistory.length > 100) {
                this.commandHistory.shift();
            }
            
            // Execute command
            await this.executeCommand(command, args, {
                senderID,
                threadID,
                messageID,
                body,
                role: userRole,
                api: this.api
            });
        } else {
            // Handle non-command messages (auto-reply, etc.)
            await this.handleRegularMessage(event);
        }
    }

    async executeCommand(command, args, context) {
        const { senderID, threadID, messageID, role, api } = context;
        
        console.log(chalk.cyan(`[CMD] ${role.toUpperCase()} ${senderID}: ${command} ${args.join(' ')}`));
        
        try {
            switch (command) {
                case 'help':
                case 'h':
                    helpCommand.execute(api, threadID, senderID, role);
                    break;
                    
                case 'info':
                case 'about':
                    infoCommand.execute(api, threadID, senderID, this);
                    break;
                    
                case 'stats':
                    if (role === 'admin' || role === 'owner') {
                        statsCommand.execute(api, threadID, this);
                    } else {
                        api.sendMessage("❌ Admin/Owner only command!", threadID);
                    }
                    break;
                    
                case 'startfun':
                case 'sf':
                    if (role === 'admin' || role === 'owner') {
                        const funType = args[0];
                        startFun.execute(api, threadID, funType, this);
                    } else {
                        api.sendMessage("❌ Admin/Owner only command!", threadID);
                    }
                    break;
                    
                case 'stopfun':
                case 'stf':
                    if (role === 'admin' || role === 'owner') {
                        stopFun.execute(api, threadID, this);
                    } else {
                        api.sendMessage("❌ Admin/Owner only command!", threadID);
                    }
                    break;
                    
                case 'addadmin':
                    if (role === 'owner') {
                        const newAdmin = args[0];
                        if (newAdmin) {
                            this.admins.push(newAdmin);
                            api.sendMessage(`✅ Added ${newAdmin} as admin`, threadID);
                        }
                    }
                    break;
                    
                case 'removeadmin':
                    if (role === 'owner') {
                        const adminToRemove = args[0];
                        if (adminToRemove) {
                            this.admins = this.admins.filter(a => a !== adminToRemove);
                            api.sendMessage(`✅ Removed ${adminToRemove} from admins`, threadID);
                        }
                    }
                    break;
                    
                case 'prefix':
                    if (role === 'admin' || role === 'owner') {
                        const newPrefix = args[0];
                        if (newPrefix && newPrefix.length === 1) {
                            this.prefix = newPrefix;
                            api.sendMessage(`✅ Prefix changed to: ${newPrefix}`, threadID);
                        }
                    }
                    break;
                    
                case 'owner':
                    if (senderID === this.ownerUID) {
                        const ownerCmd = args[0];
                        switch (ownerCmd) {
                            case 'stop':
                                api.sendMessage("🛑 Bot shutting down...", threadID);
                                setTimeout(() => process.exit(0), 1000);
                                break;
                            case 'restart':
                                api.sendMessage("🔄 Bot restarting...", threadID);
                                setTimeout(() => {
                                    this.api = null;
                                    this.initialize();
                                }, 2000);
                                break;
                            case 'status':
                                const uptime = process.uptime();
                                const hours = Math.floor(uptime / 3600);
                                const minutes = Math.floor((uptime % 3600) / 60);
                                const seconds = Math.floor(uptime % 60);
                                
                                api.sendMessage(
                                    `📊 Bot Status:\n` +
                                    `⏰ Uptime: ${hours}h ${minutes}m ${seconds}s\n` +
                                    `👥 Active Threads: ${this.funThreads.size}\n` +
                                    `📈 Commands Executed: ${this.commandHistory.length}\n` +
                                    `💾 Memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
                                    threadID
                                );
                                break;
                            default:
                                api.sendMessage(
                                    "👑 Owner Commands:\n" +
                                    "• !owner stop - Stop bot\n" +
                                    "• !owner restart - Restart bot\n" +
                                    "• !owner status - Bot status",
                                    threadID
                                );
                        }
                    }
                    break;
                    
                case 'ping':
                    api.sendMessage("🏓 Pong!", threadID);
                    break;
                    
                default:
                    if (role === 'owner') {
                        api.sendMessage(`❓ Unknown command: ${command}`, threadID);
                    }
            }
        } catch (error) {
            logger.error(`Command execution error (${command}):`, error);
            api.sendMessage(`❌ Error executing command: ${error.message}`, threadID);
        }
    }

    async handleRegularMessage(event) {
        const { body, senderID, threadID } = event;
        
        // Auto-add friend if enabled
        if (config.autoAddFriend && event.isAdd) {
            this.api.addFriend(senderID, (err) => {
                if (!err) {
                    logger.info(`Added friend: ${senderID}`);
                }
            });
        }
        
        // Auto-reply to mentions
        if (body && body.toLowerCase().includes('bot')) {
            const replies = [
                "হাই! আমি আপনার ক্রাশ বট! 😊",
                "কীভাবে সাহায্য করতে পারি?",
                "টাইপ !help দেখুন সকল কমান্ডের জন্য",
                "আমার ডেভেলপার RANA (MASTER 🪓)"
            ];
            const randomReply = replies[Math.floor(Math.random() * replies.length)];
            
            await delayManager.humanDelay();
            this.api.sendMessage(randomReply, threadID);
        }
    }

    async handleEventNotification(event) {
        // Handle group events, reactions, etc.
        logger.debug("Event notification:", event);
    }

    async handleMessageReply(event) {
        // Handle message replies
        logger.debug("Message reply:", event);
    }

    // Cleanup function
    cleanup() {
        // Stop all fun threads
        for (const [threadID, funData] of this.funThreads) {
            if (funData.interval) {
                clearInterval(funData.interval);
            }
        }
        this.funThreads.clear();
        
        console.log(chalk.yellow("🧹 Cleaning up bot resources..."));
    }
}

// Create and start bot
const bot = new MessengerBot();

// Handle process exit
process.on('SIGINT', () => {
    console.log(chalk.yellow("\n🛑 Received SIGINT, shutting down..."));
    bot.cleanup();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log(chalk.yellow("\n🛑 Received SIGTERM, shutting down..."));
    bot.cleanup();
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    console.log(chalk.red("\n❌ Uncaught Exception:"), error);
    bot.cleanup();
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.log(chalk.red("\n❌ Unhandled Rejection at:"), promise, 'reason:', reason);
});

// Export for testing
module.exports = MessengerBot;