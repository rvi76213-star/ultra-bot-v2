#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('📋 Copying fun JSON files...\n');

// Source and target directories
const sourceDir = path.join(__dirname, '..', 'src', 'commands', 'fun');
const targetDir = path.join(__dirname, '..', 'data', 'fun-json');

// Create target directory if not exists
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
  console.log(`✅ Created directory: data/fun-json`);
}

// Get all JSON files from source
let files;
try {
  files = fs.readdirSync(sourceDir);
} catch (error) {
  console.log(`❌ Source directory not found: ${sourceDir}`);
  console.log('Please run init.js first');
  process.exit(1);
}

const jsonFiles = files.filter(file => file.endsWith('.json'));
let copiedCount = 0;

// Copy each file
jsonFiles.forEach(file => {
  const sourcePath = path.join(sourceDir, file);
  const targetPath = path.join(targetDir, file);
  
  try {
    const content = fs.readFileSync(sourcePath, 'utf8');
    fs.writeFileSync(targetPath, content);
    copiedCount++;
    console.log(`✅ Copied: ${file}`);
  } catch (error) {
    console.log(`❌ Error copying ${file}:`, error.message);
  }
});

if (copiedCount > 0) {
  console.log(`\n🎉 Successfully copied ${copiedCount} fun JSON files!`);
  console.log('Source: src/commands/fun/');
  console.log('Target: data/fun-json/');
} else {
  console.log('\n⚠️ No JSON files were copied.');
  console.log('Make sure src/commands/fun/ directory contains JSON files.');
}

// Also check if we need to create default fun JSON files
if (copiedCount === 0) {
  console.log('\n🛠️ Creating default fun JSON files...');
  
  const defaultFunFiles = {
    'chor.json': [
      "Chor detected! 🚨",
      "Ei je chor ke dhore fellam! 🏃‍♂️",
      "Chor er upor najar rakho 👀",
      "Chor police ke inform korlam 👮‍♂️",
      "Shobai chor ke block koro! 🚫"
    ],
    'murgi.json': [
      "Murgi pakha nei! 🐔",
      "Murgir dim kinte hobe 🥚",
      "Murgi khabo kire? 😋",
      "Murgi cole gelo! 🏃‍♀️",
      "Murgir bacha gulo cute 🐤"
    ],
    'abal.json': [
      "Abal kothay? 🤔",
      "Abal er shopno dekhi 🌙",
      "Abal er sathe adda 😄",
      "Abal ke miss kori 💭",
      "Abal er moto keu nei ❤️"
    ],
    'senior.json': [
      "Senior er respect korte hobe 🙏",
      "Senior der experience beshi 📚",
      "Senior der advice follow koro 💡",
      "Senior der sathe bondhu howa valo 👥",
      "Senior der kachhe shikho 🎓"
    ],
    'cow.json': [
      "Goru er dudh khub healthy 🥛",
      "Goru er sathe gramer shomporko 🏞️",
      "Goru er bachcha gulo cute 🐄",
      "Goru charano farmer er kaj 👨‍🌾",
      "Goru er sound: hambaaa! 🔊"
    ],
    'goat.json': [
      "Chagol er meat tasty 🍖",
      "Chagol er sathe paharer shomporko ⛰️",
      "Chagol er bachcha gulo cute 🐐",
      "Chagol charano easy 👨‍🌾",
      "Chagol er sound: meeeeh! 🔊"
    ]
  };
  
  // Create source directory if not exists
  if (!fs.existsSync(sourceDir)) {
    fs.mkdirSync(sourceDir, { recursive: true });
  }
  
  // Create both source and target files
  Object.entries(defaultFunFiles).forEach(([filename, content]) => {
    // Create in source
    const sourcePath = path.join(sourceDir, filename);
    fs.writeFileSync(sourcePath, JSON.stringify(content, null, 2));
    
    // Create in target
    const targetPath = path.join(targetDir, filename);
    fs.writeFileSync(targetPath, JSON.stringify(content, null, 2));
    
    console.log(`✅ Created: ${filename}`);
  });
  
  console.log('\n🎉 Created default fun JSON files in both directories!');
}