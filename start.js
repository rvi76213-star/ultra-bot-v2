#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const readline = require('readline');

// Banner
console.log(chalk.cyan(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║  ██╗   ██╗ ██████╗ ██╗   ██╗██████╗      ██████╗██████╗  ║
║  ╚██╗ ██╔╝██╔═══██╗██║   ██║██╔══██╗    ██╔════╝██╔══██╗ ║
║   ╚████╔╝ ██║   ██║██║   ██║██████╔╝    ██║     ██████╔╝ ║
║    ╚██╔╝  ██║   ██║██║   ██║██╔══██╗    ██║     ██╔══██╗ ║
║     ██║   ╚██████╔╝╚██████╔╝██║  ██║    ╚██████╗██║  ██║ ║
║     ╚═╝    ╚═════╝  ╚═════╝ ╚═╝  ╚═╝     ╚═════╝╚═╝  ╚═╝ ║
║                                                          ║
║                 YOUR CRUSH BOT v2.0                      ║
║               👑 RANA (MASTER 🪓)                       ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
`));

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

class BotStarter {
    constructor() {
        this.botProcess = null;
        this.restartCount = 0;
        this.maxRestarts = 10;
    }

    async checkDependencies() {
        console.log(chalk.yellow('🔍 Checking dependencies...'));
        
        const requiredModules = [
            'facebook-chat-api',
            'axios',
            'fs-extra',
            'chalk',
            'moment'
        ];

        let allInstalled = true;
        
        for (const module of requiredModules) {
            try {
                require.resolve(module);
                console.log(chalk.green(`   ✅ ${module}`));
            } catch (e) {
                console.log(chalk.red(`   ❌ ${module} not installed`));
                allInstalled = false;
            }
        }

        if (!allInstalled) {
            console.log(chalk.yellow('\n📦 Installing missing dependencies...'));
            try {
                const installProcess = spawn('npm', ['install'], { stdio: 'inherit' });
                
                await new Promise((resolve, reject) => {
                    installProcess.on('close', (code) => {
                        if (code === 0) {
                            resolve();
                        } else {
                            reject(new Error(`Installation failed with code ${code}`));
                        }
                    });
                });
            } catch (error) {
                console.log(chalk.red('❌ Failed to install dependencies'));
                return false;
            }
        }

        return true;
    }

    async checkAppState() {
        console.log(chalk.yellow('\n🔐 Checking appstate...'));
        
        const appstatePath = path.join(__dirname, 'src/secure/appstate.json');
        
        if (!fs.existsSync(appstatePath)) {
            console.log(chalk.red('   ❌ appstate.json not found!'));
            
            const answer = await this.askQuestion('Do you want to login now? (y/n): ');
            
            if (answer.toLowerCase() === 'y') {
                await this.runLogin();
                return fs.existsSync(appstatePath);
            } else {
                console.log(chalk.yellow('ℹ️ You can login later with: npm run login'));
                return false;
            }
        } else {
            try {
                const appstate = await fs.readJson(appstatePath);
                if (Array.isArray(appstate) && appstate.length > 0) {
                    console.log(chalk.green('   ✅ Valid appstate.json found'));
                    return true;
                } else {
                    console.log(chalk.red('   ❌ Invalid appstate.json'));
                    return false;
                }
            } catch (error) {
                console.log(chalk.red('   ❌ Corrupted appstate.json'));
                return false;
            }
        }
    }

    askQuestion(question) {
        return new Promise((resolve) => {
            rl.question(chalk.cyan(question), (answer) => {
                resolve(answer);
            });
        });
    }

    async runLogin() {
        console.log(chalk.yellow('\n🔐 Starting login process...'));
        
        return new Promise((resolve) => {
            const loginProcess = spawn('node', ['login.js'], { stdio: 'inherit' });
            
            loginProcess.on('close', (code) => {
                resolve(code === 0);
            });
        });
    }

    async checkConfig() {
        console.log(chalk.yellow('\n⚙️ Checking configuration...'));
        
        const configPath = path.join(__dirname, 'config/config.json');
        const settingsPath = path.join(__dirname, 'config/settings.json');
        
        let allGood = true;
        
        if (!fs.existsSync(configPath)) {
            console.log(chalk.red('   ❌ config.json not found'));
            allGood = false;
        } else {
            console.log(chalk.green('   ✅ config.json found'));
        }
        
        if (!fs.existsSync(settingsPath)) {
            console.log(chalk.red('   ❌ settings.json not found'));
            allGood = false;
        } else {
            console.log(chalk.green('   ✅ settings.json found'));
        }
        
        return allGood;
    }

    startBot() {
        console.log(chalk.green('\n🚀 Starting bot...\n'));
        
        this.botProcess = spawn('node', ['src/index.js'], {
            stdio: 'inherit',
            detached: false
        });

        this.botProcess.on('close', (code, signal) => {
            console.log(chalk.yellow(`\n🔄 Bot process exited with code ${code}`));
            
            if (this.restartCount < this.maxRestarts) {
                this.restartCount++;
                console.log(chalk.yellow(`🔄 Restarting... (${this.restartCount}/${this.maxRestarts})`));
                setTimeout(() => this.startBot(), 3000);
            } else {
                console.log(chalk.red('❌ Max restart attempts reached. Stopping.'));
                process.exit(1);
            }
        });

        this.botProcess.on('error', (err) => {
            console.log(chalk.red('❌ Failed to start bot:'), err.message);
        });

        // Handle process signals
        process.on('SIGINT', () => {
            console.log(chalk.yellow('\n🛑 Received SIGINT, stopping bot...'));
            this.stopBot();
        });

        process.on('SIGTERM', () => {
            console.log(chalk.yellow('\n🛑 Received SIGTERM, stopping bot...'));
            this.stopBot();
        });
    }

    stopBot() {
        if (this.botProcess) {
            this.botProcess.kill('SIGTERM');
        }
        rl.close();
        process.exit(0);
    }

    async start() {
        try {
            // Check dependencies
            const depsOk = await this.checkDependencies();
            if (!depsOk) {
                console.log(chalk.red('❌ Dependencies check failed'));
                rl.close();
                return;
            }

            // Check appstate
            const appstateOk = await this.checkAppState();
            if (!appstateOk) {
                console.log(chalk.red('❌ Appstate check failed'));
                rl.close();
                return;
            }

            // Check config
            const configOk = await this.checkConfig();
            if (!configOk) {
                console.log(chalk.yellow('⚠️ Configuration issues detected'));
                const answer = await this.askQuestion('Continue anyway? (y/n): ');
                if (answer.toLowerCase() !== 'y') {
                    rl.close();
                    return;
                }
            }

            console.log(chalk.green('\n✅ All checks passed!'));
            console.log(chalk.cyan('══════════════════════════════════════════════════\n'));

            // Start the bot
            this.startBot();

        } catch (error) {
            console.log(chalk.red('❌ Startup error:'), error.message);
            rl.close();
            process.exit(1);
        }
    }
}

// Start the starter
const starter = new BotStarter();
starter.start();