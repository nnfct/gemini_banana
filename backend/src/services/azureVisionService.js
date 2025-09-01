import OpenAI from 'openai';

/**
 * Azure Computer Vision Service
 * Handles image analysis using Azure Computer Vision API
 */
export class AzureVisionService {
    constructor(options = {}) {
        this.endpoint = options.endpoint || process.env.AZURE_COMPUTER_VISION_ENDPOINT;
        this.apiKey = options.apiKey || process.env.AZURE_COMPUTER_VISION_KEY;
        this.apiVersion = options.apiVersion || '2023-10-01';
        this.deploymentId = options.deploymentId || process.env.AZURE_OPENAI_DEPLOYMENT_ID;

        // Initialize OpenAI client for Azure OpenAI (which includes vision capabilities)
        if (this.endpoint && this.apiKey) {
            this.client = new OpenAI({
                apiKey: this.apiKey,
                baseURL: `${this.endpoint}/openai/deployments/${this.deploymentId}`,
                defaultQuery: { 'api-version': '2024-02-15-preview' },
                defaultHeaders: {
                    'api-key': this.apiKey,
                },
            });
            this.isConfigured = true;
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
     * Analyzes image using Azure Computer Vision
     * @param {string} imageBase64 - Base64 encoded image
     * @param {Object} options - Analysis options
     * @returns {Object} Analysis result
     */
    async analyzeImage(imageBase64, options = {}) {
        if (!this.isConfigured) {
            throw new AzureVisionError('Azure Computer Vision not configured', 'NOT_CONFIGURED');
        }

        const {
            mimeType = 'image/jpeg',
            features = ['Categories', 'Tags', 'Objects', 'Color'],
            maxTokens = 1000
        } = options;

        try {
            console.log('🔍 Analyzing image with Azure Computer Vision...');

            const analysisPrompt = `
Analyze this fashion image and provide detailed information about the clothing items. 
Return a JSON response with the following structure:

{
    "clothing_items": [
        {
            "category": "top|pants|shoes|accessories",
            "type": "specific item type (e.g., hoodie, jeans, sneakers)",
            "color": "primary color",
            "style": "style description",
            "pattern": "pattern type (solid, striped, etc.)",
            "fit": "fit type (oversized, slim, regular)",
            "confidence": 0.95
        }
    ],
    "dominant_colors": ["color1", "color2", "color3"],
    "overall_style": "casual|formal|sporty|elegant",
    "features": {
        "colors": ["detailed color list"],
        "textures": ["texture descriptions"],
        "patterns": ["pattern descriptions"]
    }
}

Focus on fashion-relevant details that would help in product recommendations.
`;

            const response = await this.client.chat.completions.create({
                model: this.deploymentId || 'gpt-4-vision-preview',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: analysisPrompt
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:${mimeType};base64,${imageBase64}`,
                                    detail: 'high'
                                }
                            }
                        ]
                    }
                ],
                max_tokens: maxTokens,
                temperature: 0.1
            });

            const analysisText = response.choices[0]?.message?.content;
            console.log('📊 Azure analysis result:', analysisText);

            // Parse JSON response
            let analysis;
            try {
                const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
                const jsonString = jsonMatch ? jsonMatch[0] : analysisText;
                analysis = JSON.parse(jsonString);
            } catch (parseError) {
                console.error('Failed to parse Azure response as JSON:', parseError);
                // Return structured fallback
                analysis = this.createFallbackAnalysis(analysisText);
            }

            return {
                success: true,
                provider: 'azure',
                analysis,
                rawResponse: analysisText,
                processingTime: Date.now()
            };

        } catch (error) {
            console.error('Azure Computer Vision error:', error);
            throw new AzureVisionError(`Azure analysis failed: ${error.message}`, 'ANALYSIS_ERROR', { originalError: error });
        }
    }

    /**
     * Extracts visual features for similarity matching
     * @param {string} imageBase64 - Base64 encoded image
     * @returns {Object} Feature vector and metadata
     */
    async extractVisualFeatures(imageBase64) {
        const analysis = await this.analyzeImage(imageBase64);

        // Convert analysis to feature vector (simplified approach)
        const features = this.convertAnalysisToFeatures(analysis.analysis);

        return {
            vector: features.vector,
            dimensions: features.vector.length,
            model: 'azure-vision',
            version: this.apiVersion,
            metadata: {
                clothingItems: analysis.analysis.clothing_items || [],
                dominantColors: analysis.analysis.dominant_colors || [],
                overallStyle: analysis.analysis.overall_style || 'unknown'
            }
        };
    }

    /**
     * Detects and categorizes clothing items in the image
     * @param {string} imageBase64 - Base64 encoded image
     * @returns {Object} Detection result
     */
    async detectClothingItems(imageBase64) {
        const analysis = await this.analyzeImage(imageBase64);

        const clothingItems = analysis.analysis.clothing_items || [];

        return {
            items: clothingItems.map(item => ({
                category: item.category,
                type: item.type,
                confidence: item.confidence || 0.5,
                attributes: {
                    color: item.color,
                    style: item.style,
                    pattern: item.pattern,
                    fit: item.fit
                }
            })),
            dominantColors: analysis.analysis.dominant_colors || [],
            overallStyle: analysis.analysis.overall_style || 'unknown',
            confidence: this.calculateOverallConfidence(clothingItems)
        };
    }

    /**
     * Creates a fallback analysis when JSON parsing fails
     * @private
     */
    createFallbackAnalysis(rawText) {
        // Extract basic information from text response
        const colors = this.extractColorsFromText(rawText);
        const categories = this.extractCategoriesFromText(rawText);

        return {
            clothing_items: categories.map(cat => ({
                category: cat,
                type: cat,
                color: colors[0] || 'unknown',
                style: 'casual',
                pattern: 'solid',
                confidence: 0.5
            })),
            dominant_colors: colors,
            overall_style: 'casual',
            features: {
                colors: colors,
                textures: [],
                patterns: ['solid']
            }
        };
    }

    /**
     * Converts analysis to feature vector for similarity matching
     * @private
     */
    convertAnalysisToFeatures(analysis) {
        // Simplified feature vector creation
        // In a real implementation, this would be more sophisticated
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

    /**
     * Extracts color information from text
     * @private
     */
    extractColorsFromText(text) {
        const colorRegex = /\b(black|white|blue|red|green|yellow|brown|gray|grey|pink|purple|orange|navy|beige|tan|maroon|olive|teal|silver|gold)\b/gi;
        const matches = text.match(colorRegex) || [];
        return [...new Set(matches.map(color => color.toLowerCase()))];
    }

    /**
     * Extracts category information from text
     * @private
     */
    extractCategoriesFromText(text) {
        const categoryRegex = /\b(top|shirt|hoodie|jacket|pants|jeans|shoes|sneakers|boots|accessories|hat|bag)\b/gi;
        const matches = text.match(categoryRegex) || [];
        const categories = [];

        matches.forEach(match => {
            const item = match.toLowerCase();
            if (['top', 'shirt', 'hoodie', 'jacket'].includes(item)) {
                categories.push('top');
            } else if (['pants', 'jeans'].includes(item)) {
                categories.push('pants');
            } else if (['shoes', 'sneakers', 'boots'].includes(item)) {
                categories.push('shoes');
            } else if (['accessories', 'hat', 'bag'].includes(item)) {
                categories.push('accessories');
            }
        });

        return [...new Set(categories)];
    }

    /**
     * Calculates overall confidence from individual item confidences
     * @private
     */
    calculateOverallConfidence(clothingItems) {
        if (!clothingItems || clothingItems.length === 0) return 0.5;

        const totalConfidence = clothingItems.reduce((sum, item) => sum + (item.confidence || 0.5), 0);
        return totalConfidence / clothingItems.length;
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
export const azureVisionService = new AzureVisionService();
export default azureVisionService;