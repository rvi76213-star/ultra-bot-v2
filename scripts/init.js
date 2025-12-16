#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🚀 Initializing Ultra Professional Messenger Bot...\n');

// Create directory structure
const directories = [
  'src/commands/normal',
  'src/commands/fun',
  'src/commands/admin',
  'src/secure',
  'src/utils',
  'data/fun-json',
  'data/admin-photos',
  'data/logs',
  'config',
  'assets/owner-photos',
  'assets/media',
  'backups',
  'scripts'
];

directories.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

// Create package.json if not exists
const packageJsonPath = path.join(__dirname, '..', 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  const packageJson = {
    name: "ultra-professional-messenger-bot",
    version: "1.0.0",
    description: "Ultra Professional Messenger Bot with role system and fun commands",
    main: "main.js",
    scripts: {
      "start": "node main.js",
      "dev": "nodemon main.js",
      "setup": "node src/secure/setupOwner.js",
      "init": "node scripts/init.js",
      "test": "echo \"No tests specified\" && exit 0"
    },
    keywords: ["messenger", "bot", "facebook", "automation"],
    author: "Bot Developer",
    license: "MIT",
    dependencies: {
      "facebook-chat-api": "github:Schmavery/facebook-chat-api",
      "axios": "^1.6.0",
      "crypto-js": "^4.2.0",
      "moment": "^2.29.4",
      "fs-extra": "^11.2.0"
    },
    devDependencies: {
      "nodemon": "^3.0.1"
    },
    engines: {
      "node": ">=16.0.0"
    }
  };
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('✅ Created: package.json');
}

// Create config.json
const configJson = {
  prefix: "!",
  admins: [],
  ownerUid: "61578706761898",
  funEnabled: true,
  maxAdminPhotos: 3,
  delayRange: [300, 600],
  _version: "1.0.0",
  _note: "Add admin UIDs in the admins array"
};

const configPath = path.join(__dirname, '..', 'config', 'config.json');
fs.writeFileSync(configPath, JSON.stringify(configJson, null, 2));
console.log('✅ Created: config/config.json');

// Create settings.json
const settingsJson = {
  bot: {
    name: "Ultra Professional Messenger Bot",
    version: "1.0.0",
    maintainer: "Bot Owner"
  },
  performance: {
    maxConcurrentThreads: 50
  }
};

const settingsPath = path.join(__dirname, '..', 'config', 'settings.json');
fs.writeFileSync(settingsPath, JSON.stringify(settingsJson, null, 2));
console.log('✅ Created: config/settings.json');

// Create ownerPhotos.json
const ownerPhotos = Array.from({ length: 12 }, (_, i) => 
  `https://i.ibb.co/${crypto.randomBytes(8).toString('hex')}/owner${i + 1}.png`
);

const ownerPhotosPath = path.join(__dirname, '..', 'assets', 'owner-photos', 'ownerPhotos.json');
fs.writeFileSync(ownerPhotosPath, JSON.stringify(ownerPhotos, null, 2));
console.log('✅ Created: assets/owner-photos/ownerPhotos.json');

// Create fun JSON files
const funTypes = ['chor', 'murgi', 'abal', 'senior', 'cow', 'goat'];

funTypes.forEach(type => {
  // For src/commands/fun/
  const srcFunPath = path.join(__dirname, '..', 'src', 'commands', 'fun', `${type}.json`);
  const srcContent = [
    `${type.charAt(0).toUpperCase() + type.slice(1)} line 1! 🎉`,
    `${type.charAt(0).toUpperCase() + type.slice(1)} line 2! 😄`,
    `${type.charAt(0).toUpperCase() + type.slice(1)} line 3! 🚀`,
    `${type.charAt(0).toUpperCase() + type.slice(1)} line 4! 💖`,
    `${type.charAt(0).toUpperCase() + type.slice(1)} line 5! 👍`
  ];
  
  fs.writeFileSync(srcFunPath, JSON.stringify(srcContent, null, 2));
  
  // For data/fun-json/
  const dataFunPath = path.join(__dirname, '..', 'data', 'fun-json', `${type}.json`);
  fs.writeFileSync(dataFunPath, JSON.stringify(srcContent, null, 2));
  
  console.log(`✅ Created fun JSON: ${type}.json`);
});

// Create admin photo placeholders
for (let i = 1; i <= 3; i++) {
  const adminPhotoPath = path.join(__dirname, '..', 'data', 'admin-photos', `admin${i}.txt`);
  const placeholder = `# Admin Photo ${i} Placeholder\n\nReplace this file with your PNG image.\nRecommended size: 200x200 pixels\nFilename: admin${i}.png`;
  
  fs.writeFileSync(adminPhotoPath, placeholder);
  console.log(`✅ Created admin photo placeholder: admin${i}.txt`);
}

// Create appstats.json placeholder
const appstatsPath = path.join(__dirname, '..', 'src', 'secure', 'appstats.json');
const appstatsContent = {
  _note: "Place your Facebook appstate.json content here",
  _instructions: "1. Login to Facebook in browser\n2. Use FB Chat API to get appstate\n3. Copy the appstate content here"
};
fs.writeFileSync(appstatsPath, JSON.stringify(appstatsContent, null, 2));
console.log('✅ Created: src/secure/appstats.json (placeholder)');

// Create owner.lock placeholder
const ownerLockPath = path.join(__dirname, '..', 'src', 'secure', 'owner.lock');
const ownerLockContent = {
  ownerHash: "hash_will_be_generated_by_setup_script",
  ownerUid: "61578706761898",
  lockedAt: new Date().toISOString(),
  _note: "Run 'npm run setup' or 'node src/secure/setupOwner.js <your-uid>' to generate real hash"
};
fs.writeFileSync(ownerLockPath, JSON.stringify(ownerLockContent, null, 2));
console.log('✅ Created: src/secure/owner.lock (placeholder)');

// Create README.md
const readmePath = path.join(__dirname, '..', 'README.md');
const readmeContent = `# Ultra Professional Messenger Bot

Professional Facebook Messenger Bot with role-based access control.

## Features
- Role system (Owner/Admin/User)
- Fun command system
- Photo management
- Secure authentication
- Admin controls

## Quick Start

\`\`\`bash
# 1. Install dependencies
npm install

# 2. Initialize project
npm run init

# 3. Setup owner (replace with your UID)
node src/secure/setupOwner.js YOUR_FACEBOOK_UID

# 4. Add Facebook session to src/secure/appstats.json

# 5. Start the bot
npm start
\`\`\`

## Configuration
- Edit \`config/config.json\` for basic settings
- Add admin UIDs to the admins array
- Add owner photo URLs to \`assets/owner-photos/ownerPhotos.json\`

## Commands
- User: !help, !info, !stats
- Admin: !startfun, !stopfun, !managegroups
- Owner: !emergencystop, !shutdown

## Security
- Never share owner.lock file
- Keep appstats.json secure
- Regular backups recommended
\`\`\``;

fs.writeFileSync(readmePath, readmeContent);
console.log('✅ Created: README.md');

// Create .gitignore
const gitignorePath = path.join(__dirname, '..', '.gitignore');
const gitignoreContent = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.*.local

# Runtime data
data/logs/*
!data/logs/.gitkeep
data/admin-photos/*.png
backups/*

# Sensitive files
src/secure/appstats.json
src/secure/owner.lock
config/config.json

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# IDE files
.vscode/
.idea/
*.swp
*.swo

# Temporary files
tmp/
temp/
*.tmp
*.temp
`;
fs.writeFileSync(gitignorePath, gitignoreContent);
console.log('✅ Created: .gitignore');

// Create this script file itself if not exists
const currentScriptPath = __filename;
if (!fs.existsSync(currentScriptPath)) {
  // Copy the content to itself
  const scriptContent = fs.readFileSync(currentScriptPath, 'utf8');
  fs.writeFileSync(currentScriptPath, scriptContent);
}

console.log('\n🎉 Initialization complete!');
console.log('\n📋 Next steps:');
console.log('1. Run: npm install');
console.log('2. Run: node src/secure/setupOwner.js <your-facebook-uid>');
console.log('3. Add Facebook session to src/secure/appstats.json');
console.log('4. Edit config/config.json (add admin UIDs)');
console.log('5. Run: npm start');
console.log('\n💝 Your Ultra Professional Messenger Bot is ready!');