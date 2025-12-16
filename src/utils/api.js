const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class ApiWrapper {
    constructor() {
        this.cloudinaryConfig = {
            cloud_name: "dgs0yrtna",
            api_key: "567876213228362",
            api_secret: "IyWQbTOlMvKw2cCnVC5EG90wB6c",
            upload_preset: "post_master"
        };

        this.firebaseConfig = {
            apiKey: "AIzaSyBF0ydsEMmAvF5p-TI3aDckarGbubZvQWI",
            authDomain: "masterlife-ee8bc.firebaseapp.com",
            projectId: "masterlife-ee8bc",
            storageBucket: "masterlife-ee8bc.firebasestorage.app",
            messagingSenderId: "146702308955",
            appId: "1:146702308955:web:2aa498872ce393e02d917e",
            measurementId: "G-39XF3N3D4R"
        };

        this.baseURLs = {
            imgbb: "https://api.imgbb.com/1/upload",
            cloudinary: "https://api.cloudinary.com/v1_1/dgs0yrtna/upload",
            randomUser: "https://randomuser.me/api/"
        };

        this.cache = new Map();
        this.cacheDuration = 300000; // 5 minutes
    }

    // Cloudinary upload
    async uploadToCloudinary(filePath, options = {}) {
        try {
            const formData = new FormData();
            formData.append('file', fs.createReadStream(filePath));
            formData.append('upload_preset', this.cloudinaryConfig.upload_preset);
            formData.append('cloud_name', this.cloudinaryConfig.cloud_name);
            
            if (options.folder) formData.append('folder', options.folder);
            if (options.public_id) formData.append('public_id', options.public_id);

            const response = await axios.post(this.baseURLs.cloudinary, formData, {
                headers: formData.getHeaders()
            });

            return {
                success: true,
                url: response.data.secure_url,
                public_id: response.data.public_id,
                format: response.data.format,
                bytes: response.data.bytes,
                created_at: response.data.created_at
            };
        } catch (error) {
            logger.error('Cloudinary upload failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ImgBB upload
    async uploadToImgBB(filePath, apiKey = null) {
        try {
            const formData = new FormData();
            formData.append('image', fs.createReadStream(filePath));
            
            if (apiKey) {
                formData.append('key', apiKey);
            }

            const response = await axios.post(this.baseURLs.imgbb, formData, {
                headers: formData.getHeaders()
            });

            return {
                success: true,
                url: response.data.data.url,
                display_url: response.data.data.display_url,
                delete_url: response.data.data.delete_url,
                size: response.data.data.size,
                expiration: response.data.data.expiration
            };
        } catch (error) {
            logger.error('ImgBB upload failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get random user data (for testing)
    async getRandomUser(gender = null) {
        const cacheKey = `random_user_${gender || 'any'}`;
        
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheDuration) {
                return cached.data;
            }
        }

        try {
            const url = gender ? 
                `${this.baseURLs.randomUser}?gender=${gender}` :
                this.baseURLs.randomUser;

            const response = await axios.get(url);
            const user = response.data.results[0];

            const userData = {
                name: `${user.name.first} ${user.name.last}`,
                email: user.email,
                gender: user.gender,
                picture: user.picture.large,
                location: `${user.location.city}, ${user.location.country}`,
                phone: user.phone
            };

            this.cache.set(cacheKey, {
                data: userData,
                timestamp: Date.now()
            });

            return userData;
        } catch (error) {
            logger.error('Failed to get random user:', error.message);
            return null;
        }
    }

    // Shorten URL
    async shortenURL(longUrl, service = 'tinyurl') {
        try {
            let shortUrl;
            
            switch (service) {
                case 'tinyurl':
                    const response = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
                    shortUrl = response.data;
                    break;
                    
                case 'isgd':
                    const isgdResponse = await axios.get(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(longUrl)}`);
                    shortUrl = isgdResponse.data;
                    break;
                    
                default:
                    throw new Error('Unsupported URL shortening service');
            }

            return {
                success: true,
                original: longUrl,
                shortened: shortUrl,
                service: service
            };
        } catch (error) {
            logger.error('URL shortening failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get weather data (placeholder - needs actual API key)
    async getWeather(city) {
        // This is a placeholder - you need to add actual weather API
        logger.warn('Weather API not configured');
        return {
            success: false,
            message: 'Weather API not configured. Add your API key.'
        };
    }

    // Fetch data with caching
    async fetchWithCache(url, options = {}) {
        const cacheKey = `fetch_${url}_${JSON.stringify(options)}`;
        
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < (options.cacheDuration || this.cacheDuration)) {
                return cached.data;
            }
        }

        try {
            const response = await axios({
                url,
                method: options.method || 'GET',
                headers: options.headers,
                data: options.data,
                timeout: options.timeout || 10000
            });

            this.cache.set(cacheKey, {
                data: response.data,
                timestamp: Date.now()
            });

            return response.data;
        } catch (error) {
            logger.error(`Failed to fetch ${url}:`, error.message);
            throw error;
        }
    }

    // Clear cache
    clearCache() {
        this.cache.clear();
        logger.info('API cache cleared');
    }

    // Get cache stats
    getCacheStats() {
        return {
            size: this.cache.size,
            entries: Array.from(this.cache.keys())
        };
    }

    // Upload multiple files
    async uploadMultiple(files, service = 'cloudinary') {
        const results = [];
        
        for (const file of files) {
            let result;
            
            switch (service) {
                case 'cloudinary':
                    result = await this.uploadToCloudinary(file);
                    break;
                case 'imgbb':
                    result = await this.uploadToImgBB(file);
                    break;
                default:
                    result = { success: false, error: 'Unsupported service' };
            }
            
            results.push({
                file,
                result
            });
        }
        
        return results;
    }

    // Download file
    async downloadFile(url, savePath) {
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
            throw new Error(`Download failed: ${error.message}`);
        }
    }

    // Check if URL exists
    async checkURL(url) {
        try {
            const response = await axios.head(url, { timeout: 5000 });
            return {
                exists: true,
                status: response.status,
                headers: response.headers
            };
        } catch (error) {
            return {
                exists: false,
                error: error.message
            };
        }
    }

    // Get file info from URL
    async getFileInfo(url) {
        try {
            const response = await axios.head(url, { timeout: 5000 });
            return {
                success: true,
                contentType: response.headers['content-type'],
                contentLength: response.headers['content-length'],
                lastModified: response.headers['last-modified'],
                status: response.status
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = new ApiWrapper();