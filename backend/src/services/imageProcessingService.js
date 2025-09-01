import { createHash } from 'crypto';

/**
 * Enhanced Image Processing Service
 * Handles image validation, preprocessing, and memory-only processing
 */
export class ImageProcessingService {
    constructor(options = {}) {
        this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
        this.supportedFormats = options.supportedFormats || ['jpeg', 'jpg', 'png', 'webp'];
        this.maxDimensions = options.maxDimensions || { width: 2048, height: 2048 };
        this.optimalDimensions = options.optimalDimensions || { width: 224, height: 224 };
    }

    /**
     * Validates uploaded image data
     * @param {string} imageData - Base64 encoded image data
     * @returns {Object} Validation result with isValid flag and details
     */
    async validateImage(imageData) {
        try {
            // Parse data URI
            const { mimeType, base64Data, format } = this.parseDataUri(imageData);

            // Check format support
            if (!this.supportedFormats.includes(format.toLowerCase())) {
                return {
                    isValid: false,
                    error: 'UNSUPPORTED_FORMAT',
                    message: `Unsupported image format: ${format}. Supported formats: ${this.supportedFormats.join(', ')}`
                };
            }

            // Check file size
            const sizeInBytes = this.calculateBase64Size(base64Data);
            if (sizeInBytes > this.maxFileSize) {
                return {
                    isValid: false,
                    error: 'IMAGE_TOO_LARGE',
                    message: `Image size (${Math.round(sizeInBytes / 1024 / 1024)}MB) exceeds maximum allowed size (${Math.round(this.maxFileSize / 1024 / 1024)}MB)`
                };
            }

            // Get image dimensions (basic validation)
            const dimensions = await this.getImageDimensions(base64Data, mimeType);
            if (dimensions.width > this.maxDimensions.width || dimensions.height > this.maxDimensions.height) {
                return {
                    isValid: false,
                    error: 'DIMENSIONS_TOO_LARGE',
                    message: `Image dimensions (${dimensions.width}x${dimensions.height}) exceed maximum allowed (${this.maxDimensions.width}x${this.maxDimensions.height})`
                };
            }

            return {
                isValid: true,
                mimeType,
                format,
                size: sizeInBytes,
                dimensions,
                hash: this.generateImageHash(base64Data)
            };

        } catch (error) {
            return {
                isValid: false,
                error: 'INVALID_IMAGE',
                message: `Invalid image data: ${error.message}`
            };
        }
    }

    /**
     * Processes image for AI analysis (resize, optimize)
     * @param {string} imageData - Base64 encoded image data
     * @param {Object} options - Processing options
     * @returns {Object} Processed image data
     */
    async processImage(imageData, options = {}) {
        const validation = await this.validateImage(imageData);
        if (!validation.isValid) {
            throw new ImageProcessingError(validation.message, validation.error);
        }

        const { mimeType, base64Data } = this.parseDataUri(imageData);
        const { targetWidth = this.optimalDimensions.width, targetHeight = this.optimalDimensions.height } = options;

        try {
            // For now, we'll return the original image data
            // In a full implementation, you would use a library like Sharp or Canvas to resize
            const processedData = {
                base64: base64Data,
                mimeType,
                originalDimensions: validation.dimensions,
                targetDimensions: { width: targetWidth, height: targetHeight },
                size: validation.size,
                hash: validation.hash,
                processingTime: Date.now()
            };

            console.log(`📸 Processed image: ${validation.dimensions.width}x${validation.dimensions.height} -> ${targetWidth}x${targetHeight}`);

            return processedData;

        } catch (error) {
            throw new ImageProcessingError(`Failed to process image: ${error.message}`, 'PROCESSING_ERROR');
        }
    }

    /**
     * Extracts visual features from image using specified provider
     * @param {Object} imageData - Processed image data
     * @param {string} provider - 'azure', 'local', or 'auto'
     * @returns {Object} Feature extraction result
     */
    async extractFeatures(imageData, provider = 'auto') {
        const startTime = Date.now();

        try {
            let result;

            switch (provider) {
                case 'azure':
                    result = await this.extractFeaturesAzure(imageData);
                    break;
                case 'local':
                    result = await this.extractFeaturesLocal(imageData);
                    break;
                case 'auto':
                default:
                    // Try Azure first, fallback to local
                    try {
                        result = await this.extractFeaturesAzure(imageData);
                    } catch (azureError) {
                        console.warn('Azure feature extraction failed, falling back to local:', azureError.message);
                        result = await this.extractFeaturesLocal(imageData);
                    }
                    break;
            }

            const processingTime = Date.now() - startTime;

            return {
                ...result,
                processingTime,
                provider: result.provider || provider
            };

        } catch (error) {
            throw new ImageProcessingError(`Feature extraction failed: ${error.message}`, 'FEATURE_EXTRACTION_ERROR');
        }
    }

    /**
     * Categorizes clothing items in the image
     * @param {Object} imageData - Processed image data
     * @returns {Object} Categorization result
     */
    async categorizeClothing(imageData) {
        // This will be implemented with Azure Vision or local ML model
        // For now, return a mock result
        return {
            categories: [
                { name: 'top', confidence: 0.85, boundingBox: null },
                { name: 'casual', confidence: 0.75, boundingBox: null }
            ],
            dominantColors: ['black', 'gray'],
            style: 'casual',
            confidence: 0.80
        };
    }

    /**
     * Azure feature extraction implementation
     * @private
     */
    async extractFeaturesAzure(imageData) {
        const { azureComputerVisionService } = await import('./azureComputerVisionService.js');

        if (!azureComputerVisionService.isAvailable()) {
            throw new Error('Azure Computer Vision service not available');
        }

        try {
            const features = await azureComputerVisionService.extractVisualFeatures(imageData.base64);
            return {
                ...features,
                provider: 'azure'
            };
        } catch (error) {
            throw new ImageProcessingError(`Azure feature extraction failed: ${error.message}`, 'AZURE_ERROR', { originalError: error });
        }
    }

    /**
     * Mock local feature extraction for testing
     * @private
     */
    async extractFeaturesLocal(imageData) {
        // Mock implementation for testing - returns basic features
        console.log('🔄 Using mock local feature extraction...');

        return {
            vector: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.5, 0.5, 0.5, 0.5], // Mock feature vector
            dimensions: 14,
            model: 'mock-local',
            version: '1.0.0',
            metadata: {
                clothingItems: [
                    { category: 'top', type: 'shirt', confidence: 0.8 }
                ],
                dominantColors: ['black', 'white'],
                overallStyle: 'casual'
            },
            provider: 'local'
        };
    }

    /**
     * Parses data URI to extract mime type and base64 data
     * @private
     */
    parseDataUri(dataUri) {
        const matches = dataUri.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) {
            throw new Error('Invalid data URI format');
        }

        const mimeType = matches[1];
        const base64Data = matches[2];
        const format = mimeType.split('/')[1];

        return { mimeType, base64Data, format };
    }

    /**
     * Calculates file size from base64 string
     * @private
     */
    calculateBase64Size(base64String) {
        // Base64 encoding increases size by ~33%
        const padding = (base64String.match(/=/g) || []).length;
        return Math.floor((base64String.length * 3) / 4) - padding;
    }

    /**
     * Gets image dimensions from base64 data
     * @private
     */
    async getImageDimensions(base64Data, mimeType) {
        // For now, return mock dimensions
        // In a full implementation, you would decode the image header
        return { width: 800, height: 600 };
    }

    /**
     * Generates hash for image deduplication
     * @private
     */
    generateImageHash(base64Data) {
        return createHash('md5').update(base64Data).digest('hex');
    }
}

/**
 * Custom error class for image processing errors
 */
export class ImageProcessingError extends Error {
    constructor(message, code, details = {}) {
        super(message);
        this.name = 'ImageProcessingError';
        this.code = code;
        this.details = details;
    }
}

// Export singleton instance
export const imageProcessingService = new ImageProcessingService();
export default imageProcessingService;