import azureVisionService, { AzureVisionError, AZURE_VISION_ERROR_CODES } from './azureVisionService.js';

/**
 * Custom error class for visual feature extraction errors
 */
export class VisualFeatureError extends Error {
    constructor(message, code, details = {}) {
        super(message);
        this.name = 'VisualFeatureError';
        this.code = code;
        this.details = details;
    }
}

/**
 * Error codes for visual feature extraction
 */
export const VISUAL_FEATURE_ERROR_CODES = {
    EXTRACTION_FAILED: 'EXTRACTION_FAILED',
    CATEGORIZATION_FAILED: 'CATEGORIZATION_FAILED',
    COLOR_ANALYSIS_FAILED: 'COLOR_ANALYSIS_FAILED',
    STYLE_ANALYSIS_FAILED: 'STYLE_ANALYSIS_FAILED',
    INVALID_INPUT: 'INVALID_INPUT'
};

/**
 * Enhanced visual feature extraction service
 * Provides advanced clothing item detection, categorization, and style analysis
 */
export class VisualFeatureService {
    constructor() {
        this.clothingCategories = {
            'top': ['shirt', 'blouse', 'sweater', 'hoodie', 'jacket', 'coat', 'cardigan', 't-shirt', 'tank top', 'vest'],
            'pants': ['pants', 'jeans', 'trousers', 'shorts', 'leggings', 'chinos', 'slacks'],
            'dress': ['dress', 'gown', 'sundress', 'maxi dress', 'mini dress'],
            'skirt': ['skirt', 'mini skirt', 'maxi skirt', 'pencil skirt', 'a-line skirt'],
            'shoes': ['shoes', 'boots', 'sneakers', 'sandals', 'heels', 'flats', 'loafers', 'oxfords'],
            'accessories': ['hat', 'cap', 'bag', 'purse', 'backpack', 'belt', 'scarf', 'tie', 'watch', 'jewelry']
        };

        this.styleKeywords = {
            'casual': ['casual', 'relaxed', 'comfortable', 'everyday', 'laid-back'],
            'formal': ['formal', 'business', 'professional', 'elegant', 'sophisticated'],
            'sporty': ['sporty', 'athletic', 'active', 'gym', 'workout', 'fitness'],
            'trendy': ['trendy', 'fashionable', 'stylish', 'modern', 'contemporary'],
            'vintage': ['vintage', 'retro', 'classic', 'timeless', 'traditional'],
            'bohemian': ['bohemian', 'boho', 'hippie', 'free-spirited', 'artistic']
        };

        this.colorCategories = {
            'neutral': ['black', 'white', 'gray', 'grey', 'beige', 'brown', 'tan', 'cream'],
            'warm': ['red', 'orange', 'yellow', 'pink', 'coral', 'peach'],
            'cool': ['blue', 'green', 'purple', 'teal', 'navy', 'turquoise'],
            'earth': ['brown', 'tan', 'olive', 'khaki', 'rust', 'terracotta']
        };
    }

    /**
     * Extract comprehensive visual features from an image
     * @param {string} imageBase64 - Base64 encoded image data
     * @param {Object} options - Extraction options
     * @returns {Promise<Object>} Comprehensive feature analysis
     */
    async extractComprehensiveFeatures(imageBase64, options = {}) {
        try {
            console.log('Starting comprehensive visual feature extraction...');
            const startTime = Date.now();

            // Get basic Azure analysis
            const azureFeatures = await azureVisionService.extractVisualFeatures(imageBase64);

            if (!azureFeatures.success) {
                throw new VisualFeatureError(
                    'Failed to extract basic visual features',
                    VISUAL_FEATURE_ERROR_CODES.EXTRACTION_FAILED,
                    { azureError: azureFeatures.error }
                );
            }

            // Enhance with advanced analysis
            const enhancedFeatures = await this.enhanceFeatures(azureFeatures.features, options);

            // Detect and categorize clothing items
            const clothingAnalysis = await this.analyzeClothingItems(imageBase64);

            // Perform color and style analysis
            const colorAnalysis = this.analyzeColors(azureFeatures.features.colors);
            const styleAnalysis = this.analyzeStyle(azureFeatures.features, clothingAnalysis);

            const processingTime = Date.now() - startTime;
            console.log(`Comprehensive feature extraction completed in ${processingTime}ms`);

            return {
                success: true,
                processingTime,
                provider: 'azure-enhanced',
                features: {
                    basic: azureFeatures.features,
                    enhanced: enhancedFeatures,
                    clothing: clothingAnalysis,
                    colors: colorAnalysis,
                    style: styleAnalysis
                },
                vector: this.createEnhancedFeatureVector({
                    ...azureFeatures.features,
                    ...enhancedFeatures,
                    clothing: clothingAnalysis,
                    colors: colorAnalysis,
                    style: styleAnalysis
                }),
                metadata: {
                    azureProcessingTime: azureFeatures.processingTime,
                    enhancementTime: processingTime - azureFeatures.processingTime,
                    detectedCategories: clothingAnalysis.categories,
                    dominantStyle: styleAnalysis.dominantStyle,
                    colorPalette: colorAnalysis.palette
                }
            };

        } catch (error) {
            console.error('Comprehensive feature extraction failed:', error);

            if (error instanceof AzureVisionError) {
                throw new VisualFeatureError(
                    'Azure vision analysis failed',
                    VISUAL_FEATURE_ERROR_CODES.EXTRACTION_FAILED,
                    { azureError: error.message, code: error.code }
                );
            }

            throw new VisualFeatureError(
                'Visual feature extraction failed',
                VISUAL_FEATURE_ERROR_CODES.EXTRACTION_FAILED,
                { originalError: error.message }
            );
        }
    }

    /**
     * Analyze clothing items in the image with enhanced categorization
     * @param {string} imageBase64 - Base64 encoded image data
     * @returns {Promise<Object>} Enhanced clothing analysis
     */
    async analyzeClothingItems(imageBase64) {
        try {
            const clothingDetection = await azureVisionService.detectClothingItems(imageBase64);

            if (!clothingDetection.success) {
                throw new VisualFeatureError(
                    'Failed to detect clothing items',
                    VISUAL_FEATURE_ERROR_CODES.CATEGORIZATION_FAILED
                );
            }

            // Enhance clothing categorization
            const enhancedItems = clothingDetection.clothingItems.map(item => ({
                ...item,
                enhancedCategory: this.enhanceClothingCategory(item.category, item.detected),
                subcategory: this.getSubcategory(item.detected),
                attributes: this.extractClothingAttributes(item.detected)
            }));

            // Group by category
            const categorizedItems = this.groupItemsByCategory(enhancedItems);

            // Calculate category confidence scores
            const categoryScores = this.calculateCategoryScores(enhancedItems);

            return {
                success: true,
                items: enhancedItems,
                categories: Object.keys(categorizedItems),
                categorizedItems,
                categoryScores,
                totalItems: enhancedItems.length,
                processingTime: clothingDetection.processingTime
            };

        } catch (error) {
            console.error('Clothing analysis failed:', error);
            throw new VisualFeatureError(
                'Clothing item analysis failed',
                VISUAL_FEATURE_ERROR_CODES.CATEGORIZATION_FAILED,
                { originalError: error.message }
            );
        }
    }

    /**
     * Perform advanced color analysis
     * @param {Object} colorInfo - Basic color information from Azure
     * @returns {Object} Enhanced color analysis
     */
    analyzeColors(colorInfo) {
        try {
            const analysis = {
                dominant: {
                    foreground: colorInfo.dominantColorForeground,
                    background: colorInfo.dominantColorBackground,
                    accent: colorInfo.accentColor
                },
                palette: colorInfo.dominantColors || [],
                isMonochrome: colorInfo.isBwImg || false,
                temperature: this.analyzeColorTemperature(colorInfo.dominantColors || []),
                harmony: this.analyzeColorHarmony(colorInfo.dominantColors || []),
                categories: this.categorizeColors(colorInfo.dominantColors || [])
            };

            // Add color mood analysis
            analysis.mood = this.analyzeColorMood(analysis);

            // Add seasonal analysis
            analysis.season = this.analyzeSeasonalColors(analysis.palette);

            return analysis;

        } catch (error) {
            console.error('Color analysis failed:', error);
            throw new VisualFeatureError(
                'Color analysis failed',
                VISUAL_FEATURE_ERROR_CODES.COLOR_ANALYSIS_FAILED,
                { originalError: error.message }
            );
        }
    }

    /**
     * Perform style analysis based on visual features
     * @param {Object} features - Basic visual features
     * @param {Object} clothingAnalysis - Clothing analysis results
     * @returns {Object} Style analysis
     */
    analyzeStyle(features, clothingAnalysis) {
        try {
            const styleScores = {};

            // Analyze style based on tags and categories
            const allTags = [
                ...features.tags.map(t => t.name),
                ...features.categories.map(c => c.name),
                ...clothingAnalysis.items.map(i => i.detected)
            ];

            // Calculate style scores
            Object.keys(this.styleKeywords).forEach(style => {
                styleScores[style] = this.calculateStyleScore(allTags, this.styleKeywords[style]);
            });

            // Determine dominant style
            const dominantStyle = Object.keys(styleScores).reduce((a, b) =>
                styleScores[a] > styleScores[b] ? a : b
            );

            // Analyze formality level
            const formalityLevel = this.analyzeFormalityLevel(allTags, clothingAnalysis);

            // Analyze occasion suitability
            const occasions = this.analyzeOccasions(styleScores, formalityLevel);

            return {
                scores: styleScores,
                dominantStyle,
                confidence: styleScores[dominantStyle],
                formality: formalityLevel,
                occasions,
                attributes: this.extractStyleAttributes(allTags)
            };

        } catch (error) {
            console.error('Style analysis failed:', error);
            throw new VisualFeatureError(
                'Style analysis failed',
                VISUAL_FEATURE_ERROR_CODES.STYLE_ANALYSIS_FAILED,
                { originalError: error.message }
            );
        }
    }

    /**
     * Enhance basic features with additional analysis
     * @private
     */
    async enhanceFeatures(basicFeatures, options) {
        return {
            confidence: this.calculateOverallConfidence(basicFeatures),
            complexity: this.analyzeImageComplexity(basicFeatures),
            focus: this.analyzeFocusAreas(basicFeatures.objects),
            composition: this.analyzeComposition(basicFeatures.objects)
        };
    }

    /**
     * Create an enhanced feature vector for similarity matching
     * @private
     */
    createEnhancedFeatureVector(allFeatures) {
        const vector = [];

        // Category features (normalized)
        const categoryVector = new Array(10).fill(0);
        allFeatures.categories?.slice(0, 10).forEach((cat, idx) => {
            if (idx < 10) categoryVector[idx] = cat.confidence || 0;
        });
        vector.push(...categoryVector);

        // Clothing category features
        const clothingVector = new Array(6).fill(0);
        if (allFeatures.clothing?.categoryScores) {
            const categories = ['top', 'pants', 'dress', 'skirt', 'shoes', 'accessories'];
            categories.forEach((cat, idx) => {
                clothingVector[idx] = allFeatures.clothing.categoryScores[cat] || 0;
            });
        }
        vector.push(...clothingVector);

        // Color features
        const colorVector = new Array(4).fill(0);
        if (allFeatures.colors?.categories) {
            const colorCats = ['neutral', 'warm', 'cool', 'earth'];
            colorCats.forEach((cat, idx) => {
                colorVector[idx] = allFeatures.colors.categories[cat] || 0;
            });
        }
        vector.push(...colorVector);

        // Style features
        const styleVector = new Array(6).fill(0);
        if (allFeatures.style?.scores) {
            const styles = ['casual', 'formal', 'sporty', 'trendy', 'vintage', 'bohemian'];
            styles.forEach((style, idx) => {
                styleVector[idx] = allFeatures.style.scores[style] || 0;
            });
        }
        vector.push(...styleVector);

        return {
            vector,
            dimensions: vector.length,
            model: 'azure-enhanced',
            version: '1.0.0'
        };
    }

    /**
     * Helper methods for feature analysis
     * @private
     */
    enhanceClothingCategory(basicCategory, detectedName) {
        const lowerName = detectedName.toLowerCase();

        for (const [category, keywords] of Object.entries(this.clothingCategories)) {
            if (keywords.some(keyword => lowerName.includes(keyword))) {
                return category;
            }
        }

        return basicCategory || 'other';
    }

    getSubcategory(detectedName) {
        const lowerName = detectedName.toLowerCase();

        // Define subcategories
        const subcategories = {
            'shirt': 'top',
            't-shirt': 'top',
            'blouse': 'top',
            'hoodie': 'top',
            'jacket': 'outerwear',
            'coat': 'outerwear',
            'jeans': 'pants',
            'shorts': 'pants',
            'sneakers': 'shoes',
            'boots': 'shoes',
            'heels': 'shoes'
        };

        for (const [sub, main] of Object.entries(subcategories)) {
            if (lowerName.includes(sub)) {
                return sub;
            }
        }

        return 'general';
    }

    extractClothingAttributes(detectedName) {
        const attributes = [];
        const lowerName = detectedName.toLowerCase();

        // Fit attributes
        if (lowerName.includes('slim') || lowerName.includes('fitted')) attributes.push('slim-fit');
        if (lowerName.includes('loose') || lowerName.includes('oversized')) attributes.push('loose-fit');
        if (lowerName.includes('regular')) attributes.push('regular-fit');

        // Length attributes
        if (lowerName.includes('long')) attributes.push('long');
        if (lowerName.includes('short')) attributes.push('short');
        if (lowerName.includes('mini')) attributes.push('mini');
        if (lowerName.includes('maxi')) attributes.push('maxi');

        return attributes;
    }

    groupItemsByCategory(items) {
        return items.reduce((groups, item) => {
            const category = item.enhancedCategory;
            if (!groups[category]) groups[category] = [];
            groups[category].push(item);
            return groups;
        }, {});
    }

    calculateCategoryScores(items) {
        const scores = {};
        const totalConfidence = items.reduce((sum, item) => sum + item.confidence, 0);

        items.forEach(item => {
            const category = item.enhancedCategory;
            if (!scores[category]) scores[category] = 0;
            scores[category] += item.confidence / totalConfidence;
        });

        return scores;
    }

    analyzeColorTemperature(colors) {
        const warmColors = ['red', 'orange', 'yellow', 'pink'];
        const coolColors = ['blue', 'green', 'purple', 'teal'];

        let warmScore = 0;
        let coolScore = 0;

        colors.forEach(color => {
            const lowerColor = color.toLowerCase();
            if (warmColors.some(warm => lowerColor.includes(warm))) warmScore++;
            if (coolColors.some(cool => lowerColor.includes(cool))) coolScore++;
        });

        if (warmScore > coolScore) return 'warm';
        if (coolScore > warmScore) return 'cool';
        return 'neutral';
    }

    analyzeColorHarmony(colors) {
        if (colors.length <= 1) return 'monochromatic';
        if (colors.length === 2) return 'complementary';
        if (colors.length === 3) return 'triadic';
        return 'complex';
    }

    categorizeColors(colors) {
        const categories = { neutral: 0, warm: 0, cool: 0, earth: 0 };

        colors.forEach(color => {
            const lowerColor = color.toLowerCase();
            Object.keys(this.colorCategories).forEach(category => {
                if (this.colorCategories[category].some(c => lowerColor.includes(c))) {
                    categories[category]++;
                }
            });
        });

        // Normalize scores
        const total = Object.values(categories).reduce((sum, val) => sum + val, 0);
        if (total > 0) {
            Object.keys(categories).forEach(key => {
                categories[key] = categories[key] / total;
            });
        }

        return categories;
    }

    analyzeColorMood(colorAnalysis) {
        const { palette, temperature } = colorAnalysis;

        if (colorAnalysis.isMonochrome) return 'minimalist';
        if (temperature === 'warm' && palette.length > 2) return 'energetic';
        if (temperature === 'cool' && palette.length <= 2) return 'calm';
        if (palette.length > 3) return 'vibrant';
        return 'balanced';
    }

    analyzeSeasonalColors(palette) {
        const seasonalColors = {
            spring: ['pink', 'yellow', 'green', 'coral'],
            summer: ['blue', 'white', 'light', 'pastel'],
            autumn: ['orange', 'brown', 'rust', 'gold'],
            winter: ['black', 'white', 'red', 'navy']
        };

        const scores = { spring: 0, summer: 0, autumn: 0, winter: 0 };

        palette.forEach(color => {
            const lowerColor = color.toLowerCase();
            Object.keys(seasonalColors).forEach(season => {
                if (seasonalColors[season].some(c => lowerColor.includes(c))) {
                    scores[season]++;
                }
            });
        });

        return Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
    }

    calculateStyleScore(tags, keywords) {
        let score = 0;
        tags.forEach(tag => {
            const lowerTag = tag.toLowerCase();
            keywords.forEach(keyword => {
                if (lowerTag.includes(keyword)) {
                    score += 0.1;
                }
            });
        });
        return Math.min(score, 1.0);
    }

    analyzeFormalityLevel(tags, clothingAnalysis) {
        const formalKeywords = ['suit', 'dress', 'formal', 'business', 'elegant'];
        const casualKeywords = ['casual', 'jeans', 'sneakers', 'hoodie', 't-shirt'];

        let formalScore = 0;
        let casualScore = 0;

        tags.forEach(tag => {
            const lowerTag = tag.toLowerCase();
            if (formalKeywords.some(keyword => lowerTag.includes(keyword))) formalScore++;
            if (casualKeywords.some(keyword => lowerTag.includes(keyword))) casualScore++;
        });

        if (formalScore > casualScore) return 'formal';
        if (casualScore > formalScore) return 'casual';
        return 'smart-casual';
    }

    analyzeOccasions(styleScores, formalityLevel) {
        const occasions = [];

        if (formalityLevel === 'formal' || styleScores.formal > 0.5) {
            occasions.push('business', 'formal events', 'dinner');
        }

        if (formalityLevel === 'casual' || styleScores.casual > 0.5) {
            occasions.push('everyday', 'weekend', 'casual outings');
        }

        if (styleScores.sporty > 0.5) {
            occasions.push('gym', 'sports', 'active wear');
        }

        if (styleScores.trendy > 0.5) {
            occasions.push('parties', 'social events', 'date night');
        }

        return occasions.length > 0 ? occasions : ['general'];
    }

    extractStyleAttributes(tags) {
        const attributes = [];
        const lowerTags = tags.map(tag => tag.toLowerCase());

        // Pattern attributes
        if (lowerTags.some(tag => tag.includes('stripe'))) attributes.push('striped');
        if (lowerTags.some(tag => tag.includes('floral'))) attributes.push('floral');
        if (lowerTags.some(tag => tag.includes('solid'))) attributes.push('solid');
        if (lowerTags.some(tag => tag.includes('pattern'))) attributes.push('patterned');

        // Texture attributes
        if (lowerTags.some(tag => tag.includes('denim'))) attributes.push('denim');
        if (lowerTags.some(tag => tag.includes('leather'))) attributes.push('leather');
        if (lowerTags.some(tag => tag.includes('cotton'))) attributes.push('cotton');

        return attributes;
    }

    calculateOverallConfidence(features) {
        const confidences = [
            ...features.categories.map(c => c.confidence),
            ...features.tags.map(t => t.confidence),
            ...features.objects.map(o => o.confidence)
        ];

        return confidences.length > 0
            ? confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length
            : 0;
    }

    analyzeImageComplexity(features) {
        const objectCount = features.objects.length;
        const tagCount = features.tags.length;
        const categoryCount = features.categories.length;

        const totalElements = objectCount + tagCount + categoryCount;

        if (totalElements < 5) return 'simple';
        if (totalElements < 15) return 'moderate';
        return 'complex';
    }

    analyzeFocusAreas(objects) {
        if (objects.length === 0) return 'none';
        if (objects.length === 1) return 'single';
        if (objects.length <= 3) return 'focused';
        return 'multiple';
    }

    analyzeComposition(objects) {
        if (objects.length === 0) return 'empty';

        // Analyze bounding box positions to determine composition
        const positions = objects.map(obj => obj.boundingBox).filter(box => box);

        if (positions.length === 0) return 'unknown';
        if (positions.length === 1) return 'centered';

        // Simple composition analysis based on object distribution
        return 'balanced';
    }
}

// Create and export a singleton instance
const visualFeatureService = new VisualFeatureService();
export default visualFeatureService;