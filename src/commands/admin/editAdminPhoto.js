const guard = require('../../secure/guard');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const config = require('../../../config/config.json');

async function editAdminPhoto(api, event, args) {
  const userId = event.senderID;
  guard.requireAdmin(userId);
  
  if (args.length < 2) {
    api.sendMessage('Usage: !editadminphoto [1-3] [url or "remove"]', event.threadID);
    return;
  }
  
  const photoNumber = parseInt(args[0]);
  const urlOrAction = args[1];
  
  if (photoNumber < 1 || photoNumber > config.maxAdminPhotos) {
    api.sendMessage(`Invalid photo number. Use 1-${config.maxAdminPhotos}.`, event.threadID);
    return;
  }
  
  const photoPath = path.join(__dirname, `../../../data/admin-photos/admin${photoNumber}.png`);
  
  if (urlOrAction.toLowerCase() === 'remove') {
    if (fs.existsSync(photoPath)) {
      fs.unlinkSync(photoPath);
      api.sendMessage(`✅ Admin photo ${photoNumber} removed.`, event.threadID);
    } else {
      api.sendMessage(`⚠️ Photo ${photoNumber} doesn't exist.`, event.threadID);
    }
    return;
  }
  
  // Download and save photo from URL
  try {
    const response = await axios.get(urlOrAction, { responseType: 'arraybuffer' });
    
    // Check if it's an image
    const buffer = Buffer.from(response.data);
    const isImage = buffer.toString('ascii', 0, 3) === 'PNG' || 
                    buffer.toString('ascii', 0, 2) === 'ÿØ';
    
    if (!isImage) {
      api.sendMessage('❌ Invalid image format. Use PNG or JPG.', event.threadID);
      return;
    }
    
    // Save the image
    fs.writeFileSync(photoPath, buffer);
    
    api.sendMessage(`✅ Admin photo ${photoNumber} updated successfully.`, event.threadID);
  } catch (error) {
    console.error('Photo download error:', error);
    api.sendMessage('❌ Failed to download image. Check URL.', event.threadID);
  }
}

module.exports = editAdminPhoto;