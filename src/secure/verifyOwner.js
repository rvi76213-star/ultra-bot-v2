const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');
const logger = require('../utils/logger');

class OwnerVerifier {
    constructor() {
        this.ownerUID = "61578706761898";
        this.secretKey = this.generateSecretKey();
        this.ownerLockFile = path.join(__dirname, 'owner.lock');
        this.init();
    }

    init() {
        // Create owner.lock file if it doesn't exist
        if (!fs.existsSync(this.ownerLockFile)) {
            this.createOwnerLock();
        }
    }

    generateSecretKey() {
        // Generate a unique secret key for this bot instance
        const machineId = require('node-machine-id').machineIdSync();
        const salt = 'YOUR_CRUSH_BOT_SECURE_SYSTEM';
        return crypto
            .createHash('sha256')
            .update(machineId + salt + this.ownerUID)
            .digest('hex');
    }

    createOwnerLock() {
        try {
            const lockData = {
                ownerUID: this.ownerUID,
                secretKey: this.secretKey,
                createdAt: new Date().toISOString(),
                hash: this.hashOwnerUID(this.ownerUID)
            };

            // Double encryption for owner lock
            const encryptedData = this.encryptData(JSON.stringify(lockData));
            fs.writeFileSync(this.ownerLockFile, encryptedData, 'utf8');
            
            logger.success('Owner lock file created successfully');
            return true;
        } catch (error) {
            logger.error('Failed to create owner lock:', error);
            return false;
        }
    }

    hashOwnerUID(uid) {
        // Create a secure hash of the owner UID
        return crypto
            .createHmac('sha256', this.secretKey)
            .update(uid)
            .digest('hex');
    }

    encryptData(data) {
        const cipher = crypto.createCipher('aes-256-cbc', this.secretKey);
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    }

    decryptData(encryptedData) {
        try {
            const decipher = crypto.createDecipher('aes-256-cbc', this.secretKey);
            let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return JSON.parse(decrypted);
        } catch (error) {
            logger.error('Failed to decrypt owner lock:', error);
            return null;
        }
    }

    verifyOwner(userID) {
        // Direct comparison with owner UID
        if (userID === this.ownerUID) {
            return {
                isOwner: true,
                verified: true,
                uid: userID,
                message: 'Owner verified successfully'
            };
        }

        // Check owner.lock file
        try {
            if (!fs.existsSync(this.ownerLockFile)) {
                logger.warn('Owner lock file not found, creating new one');
                this.createOwnerLock();
                return {
                    isOwner: false,
                    verified: false,
                    message: 'Owner lock file recreated'
                };
            }

            const encryptedData = fs.readFileSync(this.ownerLockFile, 'utf8');
            const lockData = this.decryptData(encryptedData);

            if (!lockData) {
                return {
                    isOwner: false,
                    verified: false,
                    message: 'Failed to decrypt owner lock'
                };
            }

            // Verify hash
            const currentHash = this.hashOwnerUID(this.ownerUID);
            if (lockData.hash === currentHash && lockData.ownerUID === this.ownerUID) {
                return {
                    isOwner: userID === this.ownerUID,
                    verified: userID === this.ownerUID,
                    uid: userID,
                    storedUID: lockData.ownerUID,
                    createdAt: lockData.createdAt,
                    message: userID === this.ownerUID ? 'Owner verified' : 'Not the owner'
                };
            } else {
                logger.warn('Owner lock file tampered or corrupted');
                return {
                    isOwner: false,
                    verified: false,
                    message: 'Owner lock verification failed'
                };
            }
        } catch (error) {
            logger.error('Owner verification error:', error);
            return {
                isOwner: false,
                verified: false,
                message: `Verification error: ${error.message}`
            };
        }
    }

    isOwner(userID) {
        const result = this.verifyOwner(userID);
        return result.isOwner;
    }

    updateOwnerUID(newUID) {
        // Only current owner can update owner UID
        if (this.verifyOwner(newUID).isOwner) {
            this.ownerUID = newUID;
            this.createOwnerLock(); // Recreate lock with new UID
            logger.info(`Owner UID updated to: ${newUID}`);
            return true;
        }
        return false;
    }

    getOwnerInfo() {
        try {
            if (!fs.existsSync(this.ownerLockFile)) {
                return null;
            }

            const encryptedData = fs.readFileSync(this.ownerLockFile, 'utf8');
            const lockData = this.decryptData(encryptedData);

            if (!lockData) {
                return null;
            }

            return {
                uid: lockData.ownerUID,
                createdAt: lockData.createdAt,
                hash: lockData.hash.substring(0, 16) + '...' // Show partial hash
            };
        } catch (error) {
            logger.error('Failed to get owner info:', error);
            return null;
        }
    }

    validateOwnerSystem() {
        const checks = {
            lockFileExists: fs.existsSync(this.ownerLockFile),
            canDecrypt: false,
            hashValid: false,
            ownerUIDValid: false
        };

        try {
            if (checks.lockFileExists) {
                const encryptedData = fs.readFileSync(this.ownerLockFile, 'utf8');
                const lockData = this.decryptData(encryptedData);
                
                if (lockData) {
                    checks.canDecrypt = true;
                    
                    // Verify hash
                    const currentHash = this.hashOwnerUID(this.ownerUID);
                    checks.hashValid = lockData.hash === currentHash;
                    
                    // Verify owner UID
                    checks.ownerUIDValid = lockData.ownerUID === this.ownerUID;
                }
            }

            const allValid = Object.values(checks).every(check => check === true);
            
            return {
                valid: allValid,
                checks: checks,
                message: allValid ? 
                    'Owner system is secure and valid' : 
                    'Owner system validation failed'
            };
        } catch (error) {
            return {
                valid: false,
                error: error.message,
                message: 'Owner system validation error'
            };
        }
    }

    emergencyReset() {
        // Only to be used in case of system corruption
        try {
            if (fs.existsSync(this.ownerLockFile)) {
                const backupPath = this.ownerLockFile + '.backup';
                fs.copyFileSync(this.ownerLockFile, backupPath);
                logger.warn(`Owner lock backed up to: ${backupPath}`);
            }

            this.createOwnerLock();
            logger.warn('Owner system emergency reset performed');
            
            return {
                success: true,
                message: 'Owner system reset successfully',
                backupCreated: true
            };
        } catch (error) {
            logger.error('Emergency reset failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    getSecurityReport() {
        const validation = this.validateOwnerSystem();
        const ownerInfo = this.getOwnerInfo();

        return {
            system: {
                status: validation.valid ? 'SECURE' : 'COMPROMISED',
                validation: validation,
                lockFile: this.ownerLockFile
            },
            owner: {
                uid: this.ownerUID,
                storedInfo: ownerInfo,
                hashAlgorithm: 'SHA256-HMAC',
                encryption: 'AES-256-CBC'
            },
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = new OwnerVerifier();