const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const config = require('../../config/config.json');
const settings = require('../../config/settings.json');

class PhotoManager {
    constructor() {
        this.ownerPhotos = [];
        this.adminPhotos = [];
        this.userPhotoCache = new Map();
        this.init();
    }

    async init() {
        await this.loadOwnerPhotos();
        await this.loadAdminPhotos();
    }

    async loadOwnerPhotos() {
        try {
            const ownerPhotosPath = path.join(__dirname, '../../assets/owner-photos/ownerPhotos.json');
            if (await fs.pathExists(ownerPhotosPath)) {
                this.ownerPhotos = await fs.readJson(ownerPhotosPath);
                console.log(`✅ Loaded ${this.ownerPhotos.length} owner photos`);
            } else {
                console.warn('⚠️ ownerPhotos.json not found, using default URLs');
                this.ownerPhotos = this.getDefaultOwnerPhotos();
                await this.saveOwnerPhotos();
            }
        } catch (error) {
            console.error('Failed to load owner photos:', error);
            this.ownerPhotos = this.getDefaultOwnerPhotos();
        }
    }

    async loadAdminPhotos() {
        try {
            const adminPhotosDir = path.join(__dirname, '../../data/admin-photos/');
            if (await fs.pathExists(adminPhotosDir)) {
                const files = await fs.readdir(adminPhotosDir);
                this.adminPhotos = files
                    .filter(f => f.match(/\.(png|jpg|jpeg|gif)$/i))
                    .map(f => path.join(adminPhotosDir, f));
                console.log(`✅ Loaded ${this.adminPhotos.length} admin photos`);
            }
        } catch (error) {
            console.error('Failed to load admin photos:', error);
        }
    }

    getDefaultOwnerPhotos() {
        return [
            "https://i.ibb.co/ABC123/owner1.jpg",
            "https://i.ibb.co/DEF456/owner2.jpg",
            "https://i.ibb.co/GHI789/owner3.jpg",
            "https://i.ibb.co/JKL012/owner4.jpg",
            "https://i.ibb.co/MNO345/owner5.jpg",
            "https://i.ibb.co/PQR678/owner6.jpg",
            "https://i.ibb.co/STU901/owner7.jpg",
            "https://i.ibb.co/VWX234/owner8.jpg",
            "https://i.ibb.co/YZA567/owner9.jpg",
            "https://i.ibb.co/BCD890/owner10.jpg",
            "https://i.ibb.co/CDE123/owner11.jpg",
            "https://i.ibb.co/DEF456/owner12.jpg"
        ];
    }

    async saveOwnerPhotos() {
        try {
            const ownerPhotosPath = path.join(__dirname, '../../assets/owner-photos/ownerPhotos.json');
            await fs.ensureDir(path.dirname(ownerPhotosPath));
            await fs.writeJson(ownerPhotosPath, this.ownerPhotos, { spaces: 2 });
        } catch (error) {
            console.error('Failed to save owner photos:', error);
        }
    }

    getRandomOwnerPhoto() {
        if (this.ownerPhotos.length === 0) {
            return null;
        }
        const randomIndex = Math.floor(Math.random() * this.ownerPhotos.length);
        return this.ownerPhotos[randomIndex];
    }

    getRandomAdminPhoto() {
        if (this.adminPhotos.length === 0) {
            return null;
        }
        const randomIndex = Math.floor(Math.random() * this.adminPhotos.length);
        return this.adminPhotos[randomIndex];
    }

    async getUserPhoto(api, userID) {
        // Check cache first
        if (this.userPhotoCache.has(userID)) {
            const cached = this.userPhotoCache.get(userID);
            if (Date.now() - cached.timestamp < 3600000) { // 1 hour cache
                return cached.url;
            }
        }

        try {
            return new Promise((resolve, reject) => {
                api.getUserInfo(userID, (err, ret) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    if (ret[userID] && ret[userID].thumbSrc) {
                        const photoUrl = ret[userID].thumbSrc;
                        // Cache the photo URL
                        this.userPhotoCache.set(userID, {
                            url: photoUrl,
                            timestamp: Date.now()
                        });
                        resolve(photoUrl);
                    } else {
                        resolve(null);
                    }
                });
            });
        } catch (error) {
            console.error(`Failed to get user photo for ${userID}:`, error);
            return null;
        }
    }

    async addAdminPhoto(photoPath) {
        const maxAdminPhotos = settings.photo.adminMax || 3;
        
        if (this.adminPhotos.length >= maxAdminPhotos) {
            throw new Error(`Maximum ${maxAdminPhotos} admin photos allowed`);
        }

        // Validate file exists
        if (!await fs.pathExists(photoPath)) {
            throw new Error('Photo file not found');
        }

        // Validate file type
        const validExtensions = ['.png', '.jpg', '.jpeg', '.gif'];
        const ext = path.extname(photoPath).toLowerCase();
        if (!validExtensions.includes(ext)) {
            throw new Error('Invalid file type. Use PNG, JPG, or GIF');
        }

        // Copy to admin photos directory
        const fileName = `admin${this.adminPhotos.length + 1}${ext}`;
        const destPath = path.join(__dirname, '../../data/admin-photos/', fileName);
        
        await fs.copy(photoPath, destPath);
        this.adminPhotos.push(destPath);
        
        console.log(`✅ Added admin photo: ${fileName}`);
        return fileName;
    }

    async removeAdminPhoto(index) {
        if (index < 0 || index >= this.adminPhotos.length) {
            throw new Error('Invalid photo index');
        }

        const photoPath = this.adminPhotos[index];
        await fs.unlink(photoPath);
        this.adminPhotos.splice(index, 1);
        
        // Rename remaining files
        const adminPhotosDir = path.join(__dirname, '../../data/admin-photos/');
        const files = await fs.readdir(adminPhotosDir);
        
        let counter = 1;
        for (const file of files) {
            if (file.match(/^admin\d+\.(png|jpg|jpeg|gif)$/i)) {
                const ext = path.extname(file);
                const newName = `admin${counter}${ext}`;
                const oldPath = path.join(adminPhotosDir, file);
                const newPath = path.join(adminPhotosDir, newName);
                
                if (oldPath !== newPath) {
                    await fs.rename(oldPath, newPath);
                }
                counter++;
            }
        }
        
        // Reload admin photos
        await this.loadAdminPhotos();
        return true;
    }

    async downloadPhoto(url, savePath) {
        try {
            const response = await axios({
                url,
                method: 'GET',
                responseType: 'stream'
            });

            const writer = fs.createWriteStream(savePath);
            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => resolve(savePath));
                writer.on('error', reject);
            });
        } catch (error) {
            throw new Error(`Failed to download photo: ${error.message}`);
        }
    }

    getPhotoForRole(role, api, userID) {
        switch (role) {
            case 'owner':
                return this.getRandomOwnerPhoto();
            case 'admin':
                return this.getRandomAdminPhoto();
            case 'user':
                return this.getUserPhoto(api, userID);
            default:
                return null;
        }
    }

    async sendPhotoWithMessage(api, threadID, photoUrl, message) {
        try {
            if (!photoUrl) {
                await api.sendMessage(message, threadID);
                return;
            }

            // Download photo temporarily
            const tempPath = path.join(__dirname, '../../temp_photo.jpg');
            await this.downloadPhoto(photoUrl, tempPath);
            
            // Send with attachment
            await api.sendMessage({
                body: message,
                attachment: fs.createReadStream(tempPath)
            }, threadID);
            
            // Cleanup
            await fs.unlink(tempPath);
        } catch (error) {
            console.error('Failed to send photo:', error);
            // Fallback to text only
            await api.sendMessage(message, threadID);
        }
    }

    clearCache() {
        this.userPhotoCache.clear();
        console.log('✅ Photo cache cleared');
    }

    getStats() {
        return {
            ownerPhotos: this.ownerPhotos.length,
            adminPhotos: this.adminPhotos.length,
            cachedUserPhotos: this.userPhotoCache.size
        };
    }
}

module.exports = new PhotoManager();