const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════╗
║           🤖 YOUR CRUSH BOT TEST SUITE              ║
║            👑 RANA (MASTER 🪓)                      ║
╚══════════════════════════════════════════════════════╝
`));

class BotTester {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }

    addTest(name, testFunction) {
        this.tests.push({ name, testFunction });
    }

    async runTests() {
        console.log(chalk.blue(`\n🧪 Running ${this.tests.length} tests...\n`));

        for (let i = 0; i < this.tests.length; i++) {
            const test = this.tests[i];
            console.log(chalk.yellow(`[${i + 1}/${this.tests.length}] ${test.name}...`));

            try {
                await test.testFunction();
                console.log(chalk.green(`  ✅ PASSED: ${test.name}`));
                this.passed++;
            } catch (error) {
                console.log(chalk.red(`  ❌ FAILED: ${test.name}`));
                console.log(chalk.red(`     Error: ${error.message}`));
                this.failed++;
            }
        }

        this.showSummary();
    }

    showSummary() {
        console.log(chalk.cyan('\n══════════════════════════════════════════════════════'));
        console.log(chalk.bold('📊 TEST SUMMARY:'));
        console.log(`✅ Passed: ${this.passed}`);
        console.log(`❌ Failed: ${this.failed}`);
        console.log(`📈 Success Rate: ${((this.passed / this.tests.length) * 100).toFixed(1)}%`);

        if (this.failed === 0) {
            console.log(chalk.green.bold('\n🎉 ALL TESTS PASSED! Bot is ready to run.'));
        } else {
            console.log(chalk.red.bold('\n⚠️ SOME TESTS FAILED! Please fix the issues.'));
        }
    }
}

async function runTestSuite() {
    const tester = new BotTester();

    // Test 1: Check Node.js version
    tester.addTest('Node.js version check', async () => {
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0]);
        
        if (majorVersion < 18) {
            throw new Error(`Node.js 18+ required. Current: ${nodeVersion}`);
        }
    });

    // Test 2: Check directory structure
    tester.addTest('Directory structure', async () => {
        const requiredDirs = [
            'src/commands/normal',
            'src/commands/fun',
            'src/commands/admin',
            'src/secure',
            'src/utils',
            'data/fun-json',
            'data/admin-photos',
            'data/logs',
            'config',
            'assets/owner-photos'
        ];

        for (const dir of requiredDirs) {
            if (!fs.existsSync(dir)) {
                throw new Error(`Missing directory: ${dir}`);
            }
        }
    });

    // Test 3: Check configuration files
    tester.addTest('Configuration files', async () => {
        const requiredFiles = [
            'config/config.json',
            'config/settings.json'
        ];

        for (const file of requiredFiles) {
            if (!fs.existsSync(file)) {
                throw new Error(`Missing file: ${file}`);
            }
        }

        // Validate config.json structure
        const config = require('./config/config.json');
        if (!config.prefix || typeof config.prefix !== 'string') {
            throw new Error('Invalid prefix in config.json');
        }

        if (!Array.isArray(config.admins)) {
            throw new Error('Admins must be an array in config.json');
        }

        // Validate settings.json structure
        const settings = require('./config/settings.json');
        if (!settings.delay || !settings.delay.min || !settings.delay.max) {
            throw new Error('Invalid delay settings in settings.json');
        }
    });

    // Test 4: Check fun JSON files
    tester.addTest('Fun JSON files', async () => {
        const funFiles = [
            'chor.json',
            'murgi.json',
            'abal.json',
            'senior.json',
            'cow.json',
            'goat.json'
        ];

        for (const file of funFiles) {
            const filePath = path.join('data/fun-json', file);
            if (!fs.existsSync(filePath)) {
                throw new Error(`Missing fun file: ${filePath}`);
            }

            const content = await fs.readJson(filePath);
            if (!Array.isArray(content) || content.length === 0) {
                throw new Error(`Invalid content in: ${file}`);
            }
        }
    });

    // Test 5: Check owner photos file
    tester.addTest('Owner photos configuration', async () => {
        const ownerPhotosPath = 'assets/owner-photos/ownerPhotos.json';
        
        if (!fs.existsSync(ownerPhotosPath)) {
            throw new Error('Missing ownerPhotos.json');
        }

        const ownerPhotos = await fs.readJson(ownerPhotosPath);
        if (!Array.isArray(ownerPhotos) || ownerPhotos.length === 0) {
            throw new Error('Invalid owner photos array');
        }

        // Check if URLs need to be updated
        const sampleUrl = ownerPhotos[0];
        if (sampleUrl.includes('XXXXXXX')) {
            console.log(chalk.yellow('  ⚠️ Warning: Owner photo URLs need to be updated'));
        }
    });

    // Test 6: Check source files
    tester.addTest('Source code files', async () => {
        const requiredSourceFiles = [
            'src/index.js',
            'src/utils/logger.js',
            'src/utils/photo.js',
            'src/utils/delay.js',
            'src/secure/guard.js',
            'src/secure/verifyOwner.js',
            'src/commands/normal/help.js',
            'src/commands/normal/info.js',
            'src/commands/admin/startFun.js',
            'src/commands/admin/stopFun.js'
        ];

        for (const file of requiredSourceFiles) {
            if (!fs.existsSync(file)) {
                throw new Error(`Missing source file: ${file}`);
            }
        }
    });

    // Test 7: Check package.json
    tester.addTest('Package.json and dependencies', async () => {
        if (!fs.existsSync('package.json')) {
            throw new Error('Missing package.json');
        }

        const packageJson = require('./package.json');
        
        if (!packageJson.dependencies) {
            throw new Error('No dependencies in package.json');
        }

        // Check for critical dependencies
        const criticalDeps = ['facebook-chat-api', 'axios', 'fs-extra'];
        for (const dep of criticalDeps) {
            if (!packageJson.dependencies[dep]) {
                throw new Error(`Missing critical dependency: ${dep}`);
            }
        }
    });

    // Test 8: Check run scripts
    tester.addTest('Run scripts', async () => {
        const scripts = ['run.sh', 'start.js'];
        
        for (const script of scripts) {
            if (!fs.existsSync(script)) {
                throw new Error(`Missing script: ${script}`);
            }
        }

        // Check if run.sh is executable
        if (process.platform !== 'win32') {
            const stats = fs.statSync('run.sh');
            if (!(stats.mode & 0o111)) {
                console.log(chalk.yellow('  ⚠️ Warning: run.sh is not executable. Run: chmod +x run.sh'));
            }
        }
    });

    // Test 9: Check for appstate.json (optional)
    tester.addTest('Appstate.json check (optional)', async () => {
        const appstatePath = 'src/secure/appstate.json';
        
        if (fs.existsSync(appstatePath)) {
            const appstate = await fs.readJson(appstatePath);
            if (!Array.isArray(appstate) || appstate.length === 0) {
                throw new Error('appstate.json is empty or invalid');
            }
            console.log(chalk.green('  ✅ appstate.json found and valid'));
        } else {
            console.log(chalk.yellow('  ⚠️ Warning: appstate.json not found. Run: npm run login'));
        }
    });

    // Test 10: Check file permissions
    tester.addTest('File permissions and security', async () => {
        const sensitiveFiles = [
            'src/secure/appstate.json',
            'src/secure/owner.lock',
            'config/config.json'
        ];

        for (const file of sensitiveFiles) {
            if (fs.existsSync(file)) {
                const stats = fs.statSync(file);
                // Check if file is readable by others (should not be)
                if ((stats.mode & 0o004) !== 0) {
                    console.log(chalk.yellow(`  ⚠️ Warning: ${file} is readable by others`));
                }
            }
        }
    });

    // Run all tests
    await tester.runTests();

    // Additional recommendations
    console.log(chalk.cyan('\n🔍 RECOMMENDATIONS:'));
    
    if (!fs.existsSync('.gitignore')) {
        console.log(chalk.yellow('• Create a .gitignore file to exclude sensitive files'));
    }
    
    if (!fs.existsSync('README.md')) {
        console.log(chalk.yellow('• Create a README.md file for documentation'));
    }
    
    console.log(chalk.green('\n🚀 To start the bot:'));
    console.log('  1. npm install');
    console.log('  2. npm run login (if not logged in)');
    console.log('  3. npm start');
    console.log('\n💡 Or use the quick script: ./run.sh');
}

// Run test suite
runTestSuite().catch(console.error);