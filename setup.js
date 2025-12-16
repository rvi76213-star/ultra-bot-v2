const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');
const chalk = require('chalk');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════╗
║          🤖 YOUR CRUSH BOT SETUP WIZARD             ║
║            👑 RANA (MASTER 🪓)                      ║
╚══════════════════════════════════════════════════════╝
`));

async function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(chalk.yellow(question + ' '), (answer) => {
            resolve(answer.trim());
        });
    });
}

async function createDirectoryStructure() {
    console.log(chalk.blue('\n📁 Creating directory structure...'));
    
    const directories = [
        'src/commands/normal',
        'src/commands/fun',
        'src/commands/admin',
        'src/secure',
        'src/utils',
        'data/fun-json',
        'data/admin-photos',
        'data/logs',
        'data/exports',
        'data/backups/fun-json',
        'config',
        'assets/owner-photos',
        'assets/media',
        '.github/workflows',
        'temp'
    ];
    
    for (const dir of directories) {
        await fs.ensureDir(dir);
        console.log(chalk.green(`  ✅ Created: ${dir}`));
    }
}

async function createConfigFiles() {
    console.log(chalk.blue('\n⚙️ Creating configuration files...'));
    
    // config.json
    const configContent = {
        prefix: "!",
        admins: [],
        autoAddFriend: true,
        autoShare: true,
        maxGroups: 50,
        logLevel: "info",
        language: "bn",
        ownerName: "RANA (MASTER 🪓)",
        ownerLocation: "Faridpur, Dhaka, Bangladesh",
        ownerEmail: "ranaeditz333@gmail.com",
        ownerPhone: "01847634486",
        ownerUID: "61578706761898"
    };
    
    await fs.writeJson('config/config.json', configContent, { spaces: 2 });
    console.log(chalk.green('  ✅ Created: config/config.json'));
    
    // settings.json
    const settingsContent = {
        delay: {
            min: 300,
            max: 600
        },
        photo: {
            ownerCount: 12,
            adminMax: 3
        },
        security: {
            maxCommandsPerMinute: 30,
            blockSpam: true
        },
        features: {
            funEnabled: true,
            autoReply: false,
            welcomeMessage: true,
            startupNotification: true
        }
    };
    
    await fs.writeJson('config/settings.json', settingsContent, { spaces: 2 });
    console.log(chalk.green('  ✅ Created: config/settings.json'));
}

async function createFunJSONFiles() {
    console.log(chalk.blue('\n🎮 Creating fun JSON files...'));
    
    const funFiles = {
        'chor.json': [
            "চোর ধর চোর! 🏃‍♂️",
            "চোর পালাচ্ছে! 🚨",
            "ধর ধর চোর! 👮",
            "ওই যে চোর! 🕵️",
            "চোর ধরা পড়ল! 🎉",
            "সবাই মিলে চোর ধর! 👥",
            "চোরের শেষ রক্ষা নাই! ⚖️",
            "চোর শনাক্ত! 🔍",
            "আলট্রা চোর! 🦸",
            "চোর ভাই কেমন আছেন? 😂"
        ],
        'murgi.json': [
            "মুরগি উড়ল! 🐔✈️",
            "মুরগি ডিম দিল! 🥚",
            "কুকড়া কু! 🐓",
            "মুরগি পালাচ্ছে! 🏃‍♀️",
            "মুরগি ধর! 🎯",
            "ফ্রাইড চিকেন! 🍗",
            "মুরগির বাচ্চা! 🐤",
            "কোরবানির মুরগি! 🕌",
            "মুরগি মার খায়! 🥊",
            "লিভ মুরগি! 🐔"
        ],
        'abal.json': [
            "আবাল শুরু! 🎭",
            "আবাল টাইম! ⏰",
            "আবাল আবাল! 🤪",
            "আবাল মোড এক্টিভেট! 🚀",
            "আবাল পাওয়ার! 💪",
            "আবাল লেভেল ম্যাক্স! 📈",
            "আবাল গেম শুরু! 🎮",
            "আবাল অ্যাটাক! ⚔️",
            "আবাল ডিফেন্স! 🛡️",
            "আবাল ফাইনাল! 🏆"
        ],
        'senior.json': [
            "সিনিয়র এলো! 👴",
            "সিনিয়রের সম্মান! 🙏",
            "সিনিয়র টিচার! 👨‍🏫",
            "সিনিয়র অ্যাডভাইস! 💡",
            "সিনিয়র পাওয়ার! 🔥",
            "সিনিয়র মোড! 🎩",
            "সিনিয়র কম্যান্ড! ⚡",
            "সিনিয়র প্রেজেন্স! 👑",
            "সিনিয়র বুদ্ধি! 🧠",
            "সিনিয়র ফাইনাল! 🏁"
        ],
        'cow.json': [
            "গরু মো! 🐄",
            "গরু চরছে! 🌾",
            "গরুর দুধ! 🥛",
            "গরু পাল! 🐮",
            "গরু মার্কেট! 🏪",
            "গরু হাম্বা! 🔊",
            "গরু রেস! 🏃‍♂️",
            "গরু ফার্ম! 🏞️",
            "গরু বাচ্চা! 🐂",
            "গরু কিং! 👑"
        ],
        'goat.json': [
            "ছাগল মে! 🐐",
            "ছাগল চরছে! 🌿",
            "ছাগলের দৌড়! 🏃",
            "ছাগল রাজা! 🤴",
            "ছাগল আর্টিস্ট! 🎨",
            "ছাগল জাম্প! 🦘",
            "ছাগল ফ্যামিলি! 👨‍👩‍👧‍👦",
            "ছাগল পলিটিশিয়ান! 🎭",
            "ছাগল স্টাইল! 💃",
            "ছাগল লিজেন্ড! 🌟"
        ]
    };
    
    for (const [fileName, content] of Object.entries(funFiles)) {
        const filePath = path.join('data/fun-json', fileName);
        await fs.writeJson(filePath, content, { spaces: 2 });
        console.log(chalk.green(`  ✅ Created: ${filePath}`));
    }
}

async function createOwnerPhotosFile() {
    console.log(chalk.blue('\n📸 Creating owner photos configuration...'));
    
    const ownerPhotos = [
        "https://i.ibb.co/XXXXXXX/owner1.jpg",
        "https://i.ibb.co/XXXXXXX/owner2.jpg",
        "https://i.ibb.co/XXXXXXX/owner3.jpg",
        "https://i.ibb.co/XXXXXXX/owner4.jpg",
        "https://i.ibb.co/XXXXXXX/owner5.jpg",
        "https://i.ibb.co/XXXXXXX/owner6.jpg",
        "https://i.ibb.co/XXXXXXX/owner7.jpg",
        "https://i.ibb.co/XXXXXXX/owner8.jpg",
        "https://i.ibb.co/XXXXXXX/owner9.jpg",
        "https://i.ibb.co/XXXXXXX/owner10.jpg",
        "https://i.ibb.co/XXXXXXX/owner11.jpg",
        "https://i.ibb.co/XXXXXXX/owner12.jpg"
    ];
    
    await fs.writeJson('assets/owner-photos/ownerPhotos.json', ownerPhotos, { spaces: 2 });
    console.log(chalk.green('  ✅ Created: assets/owner-photos/ownerPhotos.json'));
    console.log(chalk.yellow('  ⚠️ Remember to update these URLs with your actual photo URLs'));
}

async function createGitHubActions() {
    console.log(chalk.blue('\n🔧 Creating GitHub Actions workflow...'));
    
    const workflowContent = `name: Deploy Messenger Bot

on:
  push:
    branches: [ main ]
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:  # Manual trigger

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
      
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm install
      
    - name: Check appstate
      id: check_appstate
      run: |
        if [ -f "src/secure/appstate.json" ]; then
          echo "✅ appstate.json exists"
          echo "exists=true" >> $GITHUB_OUTPUT
        else
          echo "❌ appstate.json not found"
          echo "exists=false" >> $GITHUB_OUTPUT
        fi
        
    - name: Start Bot (if appstate exists)
      if: steps.check_appstate.outputs.exists == 'true'
      run: |
        echo "🤖 Starting Messenger Bot..."
        npm start &
        BOT_PID=$!
        echo "BOT_PID=$BOT_PID" >> $GITHUB_ENV
        sleep 30
        
    - name: Keep alive for 5 minutes
      if: steps.check_appstate.outputs.exists == 'true'
      run: |
        echo "🔄 Bot is running..."
        sleep 300
        echo "⏰ 5 minutes completed, stopping bot..."
        
    - name: Stop Bot
      if: steps.check_appstate.outputs.exists == 'true'
      run: |
        if [ -n "$BOT_PID" ]; then
          kill $BOT_PID 2>/dev/null || true
          echo "✅ Bot stopped"
        fi
        
    - name: Upload logs (if any)
      if: always()
      uses: actions/upload-artifact@v3
      with:
        name: bot-logs
        path: data/logs/
        
    - name: Setup completion message
      if: steps.check_appstate.outputs.exists == 'false'
      run: |
        echo "⚠️ Setup incomplete: appstate.json not found"
        echo "Please login first: npm run login"
`;
    
    await fs.writeFile('.github/workflows/deploy.yml', workflowContent, 'utf8');
    console.log(chalk.green('  ✅ Created: .github/workflows/deploy.yml'));
}

async function createPlaceholderFiles() {
    console.log(chalk.blue('\n📝 Creating placeholder files...'));
    
    // Create empty admin photos directory marker
    await fs.writeFile('data/admin-photos/.gitkeep', '');
    console.log(chalk.green('  ✅ Created: data/admin-photos/.gitkeep'));
    
    // Create empty logs directory marker
    await fs.writeFile('data/logs/.gitkeep', '');
    console.log(chalk.green('  ✅ Created: data/logs/.gitkeep'));
    
    // Create empty media directory marker
    await fs.writeFile('assets/media/.gitkeep', '');
    console.log(chalk.green('  ✅ Created: assets/media/.gitkeep'));
    
    // Create empty temp directory marker
    await fs.writeFile('temp/.gitkeep', '');
    console.log(chalk.green('  ✅ Created: temp/.gitkeep'));
}

async function main() {
    try {
        console.log(chalk.yellow('This setup wizard will create all necessary files and directories.'));
        
        const proceed = await askQuestion('Do you want to continue? (yes/no):');
        if (proceed.toLowerCase() !== 'yes') {
            console.log(chalk.yellow('Setup cancelled.'));
            rl.close();
            return;
        }
        
        // Create directory structure
        await createDirectoryStructure();
        
        // Create config files
        await createConfigFiles();
        
        // Create fun JSON files
        await createFunJSONFiles();
        
        // Create owner photos file
        await createOwnerPhotosFile();
        
        // Create GitHub Actions
        await createGitHubActions();
        
        // Create placeholder files
        await createPlaceholderFiles();
        
        console.log(chalk.green.bold('\n✅ SETUP COMPLETED SUCCESSFULLY!'));
        console.log(chalk.cyan('\n📋 NEXT STEPS:'));
        console.log('1. Install dependencies: ' + chalk.green('npm install'));
        console.log('2. Login to Facebook: ' + chalk.green('npm run login'));
        console.log('3. Update owner photo URLs in: ' + chalk.green('assets/owner-photos/ownerPhotos.json'));
        console.log('4. Add admin UIDs in: ' + chalk.green('config/config.json'));
        console.log('5. Start the bot: ' + chalk.green('npm start'));
        console.log('\n💡 Quick start: ' + chalk.yellow('./run.sh'));
        
        console.log(chalk.cyan('\n📞 Support:'));
        console.log('Developer: RANA (MASTER 🪓)');
        console.log('Email: ranaeditz333@gmail.com');
        console.log('Telegram: @rana_editz_00');
        
    } catch (error) {
        console.error(chalk.red('\n❌ Setup failed:'), error);
    } finally {
        rl.close();
    }
}

// Run setup
main();