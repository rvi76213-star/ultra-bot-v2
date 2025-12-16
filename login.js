const fs = require('fs-extra');
const path = require('path');
const login = require('facebook-chat-api');
const readline = require('readline');
const chalk = require('chalk');

console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════╗
║           🔐 FACEBOOK LOGIN FOR BOT                  ║
║            👑 RANA (MASTER 🪓)                      ║
╚══════════════════════════════════════════════════════╝
`));

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(chalk.yellow(question), (answer) => {
            resolve(answer.trim());
        });
    });
}

async function main() {
    try {
        console.log(chalk.cyan('📱 Login Instructions:'));
        console.log(chalk.yellow('1. Use Facebook account email and password'));
        console.log(chalk.yellow('2. If 2FA enabled, enter code when prompted'));
        console.log(chalk.yellow('3. appstate.json will be saved automatically\n'));
        
        const email = await askQuestion('📧 Enter Facebook Email: ');
        const password = await askQuestion('🔑 Enter Facebook Password: ');
        
        console.log(chalk.blue('\n⏳ Logging in... Please wait...'));
        
        login({ email, password }, (err, api) => {
            if (err) {
                switch (err.error) {
                    case 'login-approval':
                        console.log(chalk.blue('\n📱 Two-factor authentication required!'));
                        rl.question('Enter the code sent to your phone/email: ', (code) => {
                            err.continue(code);
                        });
                        return;
                    
                    case 'Wrong username/password.':
                        console.log(chalk.red('❌ Wrong email or password!'));
                        rl.close();
                        process.exit(1);
                        break;
                    
                    default:
                        console.log(chalk.red('❌ Login failed:'), err.error);
                        console.log(chalk.yellow('\n💡 Tips:'));
                        console.log('1. Check your internet connection');
                        console.log('2. Make sure Facebook account is active');
                        console.log('3. Try logging in via browser first');
                        console.log('4. Disable 2FA temporarily if possible');
                        rl.close();
                        process.exit(1);
                }
                return;
            }
            
            // Save appstate
            const appstate = api.getAppState();
            const secureDir = path.join(__dirname, 'src/secure');
            
            fs.ensureDirSync(secureDir);
            fs.writeFileSync(
                path.join(secureDir, 'appstate.json'),
                JSON.stringify(appstate, null, 2)
            );
            
            console.log(chalk.green.bold('\n✅ LOGIN SUCCESSFUL!'));
            console.log(chalk.green('✅ appstate.json saved successfully!'));
            
            // Get user info
            api.getCurrentUserID((err, userID) => {
                if (!err) {
                    api.getUserInfo(userID, (err, ret) => {
                        if (!err && ret[userID]) {
                            const user = ret[userID];
                            console.log(chalk.cyan('\n👤 Account Info:'));
                            console.log(`   Name: ${user.name}`);
                            console.log(`   ID: ${userID}`);
                            console.log(`   Profile: ${user.profileUrl || 'N/A'}`);
                        }
                        
                        console.log(chalk.green.bold('\n🚀 NEXT STEP:'));
                        console.log(chalk.yellow('Run: npm start'));
                        console.log(chalk.yellow('Or: node start.js'));
                        
                        rl.close();
                        process.exit(0);
                    });
                } else {
                    rl.close();
                    process.exit(0);
                }
            });
        });
        
    } catch (error) {
        console.error(chalk.red('❌ Error:'), error);
        rl.close();
        process.exit(1);
    }
}

// Handle Ctrl+C
rl.on('SIGINT', () => {
    console.log(chalk.yellow('\n\n🛑 Login cancelled by user.'));
    rl.close();
    process.exit(0);
});

// Start login process
main();