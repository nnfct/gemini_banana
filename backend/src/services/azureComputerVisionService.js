/**
 * Azure Computer Vision Service
 * Uses Azure Computer Vision API for image analysis (not OpenAI)
 */
export class AzureComputerVisionService {
    constructor(options = {}) {
        this.endpoint = options.endpoint || process.env.AZURE_COMPUTER_VISION_ENDPOINT;
        this.apiKey = options.apiKey || process.env.AZURE_COMPUTER_VISION_KEY;
        this.apiVersion = options.apiVersion || '2023-10-01';

        // Check if Azure Computer Vision is configured
        if (this.endpoint && this.apiKey) {
            // Remove trailing slash from endpoint
            this.endpoint = this.endpoint.replace(/\/$/, '');
            this.isConfigured = true;
            console.log('✅ Azure Computer Vision configured');
        } else {
            this.isConfigured = false;
            console.warn('⚠️  Azure Computer Vision not configured. Set AZURE_COMPUTER_VISION_ENDPOINT and AZURE_COMPUTER_VISION_KEY environment variables.');
        }
    }

    /**
     * Checks if Azure service is available and configured
     * @returns {boolean} True if service is available
     */
    isAvailable() {
        return this.isConfigured;
    }

    /**
     * Analyzes image using Azure Computer Vision API
     * @param {string} imageBase64 - Base64 encoded image
     * @param {Object} options - Analysis options
     * @returns {Object} Analysis result
     */
    async analyzeImage(imageBase64, options = {}) {
        if (!this.isConfigured) {
            throw new AzureVisionError('Azure Computer Vision not configured', 'NOT_CONFIGURED');
        }

        const { mimeType = 'image/jpeg' } = options;

        try {
            console.log('🔍 Analyzing image with Azure Computer Vision API...');

            // Convert base64 to buffer
            const imageBuffer = Buffer.from(imageBase64, 'base64');

            // Azure Computer Vision analyze endpoint
            const analyzeUrl = `${this.endpoint}/vision/v${this.apiVersion}/analyze`;

            // Features to analyze
            const visualFeatures = [
                'Categories',
                'Tags',
                'Description',
                'Objects',
                'Color'
            ].join(',');

            const response = await fetch(`${analyzeUrl}?visualFeatures=${visualFeatures}`, {
                method: 'POST',
                headers: {
                    'Ocp-Apim-Subscription-Key': this.apiKey,
                    'Content-Type': 'application/octet-stream'
                },
                body: imageBuffer
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Azure API error: ${response.status} - ${errorText}`);
            }

            const azureResult = await response.json();
            console.log('📊 Azure Computer Vision result:', JSON.stringify(azureResult, null, 2));

            // Convert Azure result to our format
            const analysis = this.convertAzureResultToAnalysis(azureResult);

            return {
                success: true,
                provider: 'azure-computer-vision',
                analysis,
                rawResponse: azureResult,
                processingTime: Date.now()
            };

        } catch (error) {
            console.error('Azure Computer Vision error:', error);
            throw new AzureVisionError(`Azure analysis failed: ${error.message}`, 'ANALYSIS_ERROR', { originalError: error });
        }
    }

    /**
     * Converts Azure Computer Vision result to our standard format
     * @private
     */
    convertAzureResultToAnalysis(azureResult) {
        const clothingItems = [];
        const dominantColors = [];
        let overallStyle = 'casual';

        // Extract colors
        if (azureResult.color) {
            if (azureResult.color.dominantColors) {
                dominantColors.push(...azureResult.color.dominantColors.map(c => c.toLowerCase()));
            }
            if (azureResult.color.dominantColorForeground) {
                dominantColors.push(azureResult.color.dominantColorForeground.toLowerCase());
            }
            if (azureResult.color.dominantColorBackground) {
                dominantColors.push(azureResult.color.dominantColorBackground.toLowerCase());
            }
        }

        // Extract clothing items from tags and objects
        const clothingTags = this.extractClothingFromTags(azureResult.tags || []);
        const clothingObjects = this.extractClothingFromObjects(azureResult.objects || []);

        clothingItems.push(...clothingTags, ...clothingObjects);

        // Determine overall style from categories and tags
        overallStyle = this.determineOverallStyle(azureResult.categories || [], azureResult.tags || []);

        return {
            clothing_items: clothingItems,
            dominant_colors: [...new Set(dominantColors)], // Remove duplicates
            overall_style: overallStyle,
            features: {
                colors: dominantColors,
                textures: this.extractTextures(azureResult.tags || []),
                patterns: this.extractPatterns(azureResult.tags || [])
            }
        };
    }

    /**
     * Extracts clothing items from Azure tags
     * @private
     */
    extractClothingFromTags(tags) {
        const clothingItems = [];
        const clothingKeywords = {
            'shirt': { category: 'top', type: 'shirt' },
            'hoodie': { category: 'top', type: 'hoodie' },
            'jacket': { category: 'top', type: 'jacket' },
            'sweater': { category: 'top', type: 'sweater' },
            'blouse': { category: 'top', type: 'blouse' },
            'pants': { category: 'pants', type: 'pants' },
            'jeans': { category: 'pants', type: 'jeans' },
            'trousers': { category: 'pants', type: 'trousers' },
            'shorts': { category: 'pants', type: 'shorts' },
            'shoes': { category: 'shoes', type: 'shoes' },
            'sneakers': { category: 'shoes', type: 'sneakers' },
            'boots': { category: 'shoes', type: 'boots' },
            'sandals': { category: 'shoes', type: 'sandals' }
        };

        tags.forEach(tag => {
            const tagName = tag.name.toLowerCase();
            const keyword = Object.keys(clothingKeywords).find(k => tagName.includes(k));

            if (keyword) {
                const item = clothingKeywords[keyword];
                clothingItems.push({
                    category: item.category,
                    type: item.type,
                    color: 'unknown',
                    style: 'casual',
                    pattern: 'solid',
                    confidence: tag.confidence || 0.5
                });
            }
        });

        return clothingItems;
    }

    /**
     * Extracts clothing items from Azure objects
     * @private
     */
    extractClothingFromObjects(objects) {
        const clothingItems = [];

        objects.forEach(obj => {
            const objectName = obj.object.toLowerCase();
            let category = 'accessories';
            let type = objectName;

            if (['shirt', 'hoodie', 'jacket', 'sweater'].some(item => objectName.includes(item))) {
                category = 'top';
            } else if (['pants', 'jeans', 'trousers'].some(item => objectName.includes(item))) {
                category = 'pants';
            } else if (['shoes', 'sneakers', 'boots'].some(item => objectName.includes(item))) {
                category = 'shoes';
            }

            clothingItems.push({
                category,
                type,
                color: 'unknown',
                style: 'casual',
                pattern: 'solid',
                confidence: obj.confidence || 0.5
            });
        });

        return clothingItems;
    }

    /**
     * Determines overall style from categories and tags
     * @private
     */
    determineOverallStyle(categories, tags) {
        const allText = [
            ...categories.map(c => c.name),
            ...tags.map(t => t.name)
        ].join(' ').toLowerCase();

        if (allText.includes('formal') || allText.includes('business') || allText.includes('suit')) {
            return 'formal';
        } else if (allText.includes('sport') || allText.includes('athletic') || allText.includes('gym')) {
            return 'sporty';
        } else if (allText.includes('elegant') || allText.includes('dress') || allText.includes('evening')) {
            return 'elegant';
        } else {
            return 'casual';
        }
    }

    /**
     * Extracts texture information from tags
     * @private
     */
    extractTextures(tags) {
        const textureKeywords = ['cotton', 'denim', 'leather', 'silk', 'wool', 'polyester', 'linen'];
        const textures = [];

        tags.forEach(tag => {
            const tagName = tag.name.toLowerCase();
            textureKeywords.forEach(texture => {
                if (tagName.includes(texture)) {
                    textures.push(texture);
                }
            });
        });

        return [...new Set(textures)];
    }

    /**
     * Extracts pattern information from tags
     * @private
     */
    extractPatterns(tags) {
        const patternKeywords = ['striped', 'plaid', 'checkered', 'floral', 'polka dot', 'solid'];
        const patterns = [];

        tags.forEach(tag => {
            const tagName = tag.name.toLowerCase();
            patternKeywords.forEach(pattern => {
                if (tagName.includes(pattern)) {
                    patterns.push(pattern);
                }
            });
        });

        return patterns.length > 0 ? [...new Set(patterns)] : ['solid'];
    }

    /**
     * Extracts visual features for similarity matching
     * @param {string} imageBase64 - Base64 encoded image
     * @returns {Object} Feature vector and metadata
     */
    async extractVisualFeatures(imageBase64) {
        const analysis = await this.analyzeImage(imageBase64);

        // Convert analysis to feature vector
        const features = this.convertAnalysisToFeatures(analysis.analysis);

        return {
            vector: features.vector,
            dimensions: features.vector.length,
            model: 'azure-computer-vision',
            version: this.apiVersion,
            metadata: {
                clothingItems: analysis.analysis.clothing_items || [],
                dominantColors: analysis.analysis.dominant_colors || [],
                overallStyle: analysis.analysis.overall_style || 'unknown'
            }
        };
    }

    /**
     * Converts analysis to feature vector for similarity matching
     * @private
     */
    convertAnalysisToFeatures(analysis) {
        const features = [];

        // Color features (one-hot encoding for common colors)
        const commonColors = ['black', 'white', 'blue', 'red', 'green', 'yellow', 'brown', 'gray', 'pink', 'purple'];
        const dominantColors = analysis.dominant_colors || [];

        commonColors.forEach(color => {
            features.push(dominantColors.includes(color) ? 1 : 0);
        });

        // Category features
        const categories = ['top', 'pants', 'shoes', 'accessories'];
        const detectedCategories = (analysis.clothing_items || []).map(item => item.category);

        categories.forEach(category => {
            features.push(detectedCategories.includes(category) ? 1 : 0);
        });

        // Style features
        const styles = ['casual', 'formal', 'sporty', 'elegant'];
        const overallStyle = analysis.overall_style || 'casual';

        styles.forEach(style => {
            features.push(style === overallStyle ? 1 : 0);
        });

        return { vector: features };
    }
}

/**
 * Custom error class for Azure Vision errors
 */
export class AzureVisionError extends Error {
    constructor(message, code, details = {}) {
        super(message);
        this.name = 'AzureVisionError';
        this.code = code;
        this.details = details;
    }
}

// Export singleton instance
export const azureComputerVisionService = new AzureComputerVisionService();
export default azureComputerVisionService;