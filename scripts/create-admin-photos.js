#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🖼️ Creating admin photo placeholders...\n');

const adminPhotosDir = path.join(__dirname, '..', 'data', 'admin-photos');

// Create directory if not exists
if (!fs.existsSync(adminPhotosDir)) {
  fs.mkdirSync(adminPhotosDir, { recursive: true });
  console.log(`✅ Created directory: data/admin-photos`);
}

// Create 3 admin photo placeholders
for (let i = 1; i <= 3; i++) {
  const txtFilePath = path.join(adminPhotosDir, `admin${i}.txt`);
  const pngFilePath = path.join(adminPhotosDir, `admin${i}.png`);
  
  const txtContent = `# Admin Photo ${i} - Placeholder

This is a placeholder file for admin photo ${i}.

## Instructions:
1. Delete this file (admin${i}.txt)
2. Add your actual photo as: admin${i}.png
3. Recommended: PNG format, 200x200 pixels
4. Maximum size: 2MB

## Notes:
- You can use any image editing software
- Make sure the photo is clear and professional
- The bot will randomly display these photos for admin actions

Created: ${new Date().toISOString()}
Bot: Ultra Professional Messenger Bot`;

  // Create text placeholder
  fs.writeFileSync(txtFilePath, txtContent);
  console.log(`✅ Created placeholder: admin${i}.txt`);
  
  // Check if PNG already exists
  if (!fs.existsSync(pngFilePath)) {
    console.log(`   ⚠️  Please add admin${i}.png file manually`);
  } else {
    console.log(`   ✅ Found existing: admin${i}.png`);
  }
}

console.log('\n📋 Admin Photo Setup Instructions:');
console.log('================================');
console.log('1. For each admin photo (1-3):');
console.log('   - Delete the .txt file');
console.log('   - Add a .png file with the same name');
console.log('');
console.log('2. Example:');
console.log('   Delete: admin1.txt');
console.log('   Add:    admin1.png (your photo)');
console.log('');
console.log('3. Photo requirements:');
console.log('   - Format: PNG (recommended) or JPG');
console.log('   - Size: 200x200 pixels (ideal)');
console.log('   - Max file size: 2MB');
console.log('   - Content: Professional/admin related');
console.log('');
console.log('4. The bot will use these photos when:');
console.log('   - Admin executes commands');
console.log('   - Admin starts/stops fun');
console.log('   - Admin manages groups');
console.log('');
console.log('🎉 Done! Admin photo placeholders created.');