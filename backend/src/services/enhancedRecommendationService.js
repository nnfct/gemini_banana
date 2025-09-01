import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Enhanced Recommendation Service
 * Provides visual similarity-based recommendations using Azure Computer Vision
 */
export class EnhancedRecommendationService {
    constructor(options = {}) {
        this.catalogPath = options.catalogPath || join(__dirname, '../../../data/catalog.json');
        this.catalog = null;
        this.vectorCache = new Map();
        this.similarityThreshold = options.similarityThreshold || 0.3;
        this.maxResults = options.maxResults || 10;

        this.loadCatalog();
    }

    /**
     * Loads product catalog from JSON file
     * @private
     */
    loadCatalog() {
        try {
            const catalogData = readFileSync(this.catalogPath, 'utf8');
            this.catalog = JSON.parse(catalogData);
            console.log(`📚 Loaded ${this.catalog.length} products from catalog`);
        } catch (error) {
            console.error('Failed to load catalog:', error);
            this.catalog = [];
        }
    }

    /**
     * Gets visual recommendations based on image analysis
     * @param {Object} imageFeatures - Extracted image features
     * @param {Object} options - Recommendation options
     * @returns {Object} Categorized recommendations
     */
    async getVisualRecommendations(imageFeatures, options = {}) {
        const {
            categories = null,
            maxResults = this.maxResults,
            minSimilarity = this.similarityThreshold,
            priceRange = null,
            brands = null
        } = options;

        try {
            console.log('🔍 Generating visual recommendations...');

            // Get similar items based on visual features
            const similarItems = await this.findVisuallySimilarItems(imageFeatures, {
                categories,
                minSimilarity
            });

            // Apply additional filters
            let filteredItems = this.applyFilters(similarItems, {
                priceRange,
                brands,
                maxResults: maxResults * 2 // Get more items before final ranking
            });

            // Rank recommendations
            const rankedItems = await this.rankRecommendations(filteredItems, imageFeatures);

            // Categorize recommendations
            const categorizedRecommendations = this.categorizeRecommendations(rankedItems, maxResults);

            return {
                success: true,
                recommendations: categorizedRecommendations,
                metadata: {
                    totalFound: similarItems.length,
                    afterFiltering: filteredItems.length,
                    detectedCategories: this.extractDetectedCategories(imageFeatures),
                    dominantColors: this.extractDominantColors(imageFeatures),
                    processingTime: Date.now()
                }
            };

        } catch (error) {
            console.error('Visual recommendation error:', error);
            throw new RecommendationError(`Failed to generate visual recommendations: ${error.message}`, 'RECOMMENDATION_ERROR');
        }
    }

    /**
     * Finds visually similar items using feature comparison
     * @param {Object} imageFeatures - Query image features
     * @param {Object} options - Search options
     * @returns {Array} Similar items with similarity scores
     */
    async findVisuallySimilarItems(imageFeatures, options = {}) {
        const { categories = null, minSimilarity = this.similarityThreshold } = options;

        const similarItems = [];

        for (const item of this.catalog) {
            // Skip if category filter is specified and doesn't match
            if (categories && !categories.includes(item.category)) {
                continue;
            }

            // Calculate similarity score
            const similarity = this.calculateSimilarity(imageFeatures, item);

            if (similarity >= minSimilarity) {
                similarItems.push({
                    ...item,
                    similarity,
                    matchReasons: this.getMatchReasons(imageFeatures, item, similarity)
                });
            }
        }

        // Sort by similarity score (descending)
        return similarItems.sort((a, b) => b.similarity - a.similarity);
    }

    /**
     * Calculates similarity between image features and catalog item
     * @param {Object} imageFeatures - Query image features
     * @param {Object} catalogItem - Catalog item to compare
     * @returns {number} Similarity score (0-1)
     */
    calculateSimilarity(imageFeatures, catalogItem) {
        let totalScore = 0;
        let weightSum = 0;

        // Color similarity (weight: 0.4)
        const colorScore = this.calculateColorSimilarity(imageFeatures, catalogItem);
        totalScore += colorScore * 0.4;
        weightSum += 0.4;

        // Category similarity (weight: 0.3)
        const categoryScore = this.calculateCategorySimilarity(imageFeatures, catalogItem);
        totalScore += categoryScore * 0.3;
        weightSum += 0.3;

        // Style similarity (weight: 0.2)
        const styleScore = this.calculateStyleSimilarity(imageFeatures, catalogItem);
        totalScore += styleScore * 0.2;
        weightSum += 0.2;

        // Tag similarity (weight: 0.1)
        const tagScore = this.calculateTagSimilarity(imageFeatures, catalogItem);
        totalScore += tagScore * 0.1;
        weightSum += 0.1;

        return weightSum > 0 ? totalScore / weightSum : 0;
    }

    /**
     * Calculates color similarity between image and catalog item
     * @private
     */
    calculateColorSimilarity(imageFeatures, catalogItem) {
        const imageColors = this.extractDominantColors(imageFeatures);
        const itemColors = catalogItem.tags.filter(tag =>
            ['black', 'white', 'blue', 'red', 'green', 'yellow', 'brown', 'gray', 'pink', 'purple', 'navy', 'beige'].includes(tag.toLowerCase())
        );

        if (imageColors.length === 0 || itemColors.length === 0) return 0.5;

        let matches = 0;
        for (const imageColor of imageColors) {
            if (itemColors.some(itemColor => itemColor.toLowerCase() === imageColor.toLowerCase())) {
                matches++;
            }
        }

        return matches / Math.max(imageColors.length, itemColors.length);
    }

    /**
     * Calculates category similarity
     * @private
     */
    calculateCategorySimilarity(imageFeatures, catalogItem) {
        const detectedCategories = this.extractDetectedCategories(imageFeatures);

        if (detectedCategories.includes(catalogItem.category)) {
            return 1.0;
        }

        // Check for related categories
        const categoryRelations = {
            'top': ['shirt', 'hoodie', 'jacket', 't-shirt'],
            'pants': ['jeans', 'slacks', 'trousers'],
            'shoes': ['sneakers', 'boots', 'sandals']
        };

        const relatedTags = categoryRelations[catalogItem.category] || [];
        const hasRelatedTag = catalogItem.tags.some(tag => relatedTags.includes(tag.toLowerCase()));

        return hasRelatedTag ? 0.7 : 0.3;
    }

    /**
     * Calculates style similarity
     * @private
     */
    calculateStyleSimilarity(imageFeatures, catalogItem) {
        const imageStyle = imageFeatures.metadata?.overallStyle || 'casual';
        const itemStyles = catalogItem.tags.filter(tag =>
            ['casual', 'formal', 'sporty', 'elegant', 'vintage', 'modern'].includes(tag.toLowerCase())
        );

        if (itemStyles.some(style => style.toLowerCase() === imageStyle.toLowerCase())) {
            return 1.0;
        }

        return 0.5; // Default similarity for style
    }

    /**
     * Calculates tag-based similarity
     * @private
     */
    calculateTagSimilarity(imageFeatures, catalogItem) {
        // This could be enhanced with more sophisticated tag matching
        // For now, return a base score
        return 0.5;
    }

    /**
     * Applies additional filters to recommendations
     * @private
     */
    applyFilters(items, filters) {
        let filtered = [...items];

        // Price range filter
        if (filters.priceRange) {
            const [minPrice, maxPrice] = filters.priceRange;
            filtered = filtered.filter(item =>
                item.price >= minPrice && item.price <= maxPrice
            );
        }

        // Brand filter
        if (filters.brands && filters.brands.length > 0) {
            filtered = filtered.filter(item =>
                filters.brands.includes(item.brand)
            );
        }

        // Limit results
        if (filters.maxResults) {
            filtered = filtered.slice(0, filters.maxResults);
        }

        return filtered;
    }

    /**
     * Ranks recommendations using additional business logic
     * @private
     */
    async rankRecommendations(items, imageFeatures) {
        return items.map(item => {
            let rankingScore = item.similarity;

            // Boost popular items slightly
            if (item.popularity) {
                rankingScore += item.popularity * 0.1;
            }

            // Boost items with good ratings
            if (item.rating && item.rating > 4.0) {
                rankingScore += 0.05;
            }

            // Boost available items
            if (item.availability !== false) {
                rankingScore += 0.02;
            }

            return {
                ...item,
                rankingScore
            };
        }).sort((a, b) => b.rankingScore - a.rankingScore);
    }

    /**
     * Categorizes recommendations by clothing type
     * @private
     */
    categorizeRecommendations(items, maxPerCategory = 3) {
        const categories = {
            top: [],
            pants: [],
            shoes: [],
            accessories: []
        };

        for (const item of items) {
            const category = item.category || 'accessories';
            if (categories[category] && categories[category].length < maxPerCategory) {
                categories[category].push({
                    id: item.id,
                    title: item.title,
                    price: item.price,
                    originalPrice: item.originalPrice,
                    discount: item.discount,
                    brand: item.brand,
                    category: item.category,
                    imageUrl: item.imageUrl,
                    similarity: item.similarity,
                    rankingScore: item.rankingScore,
                    matchReasons: item.matchReasons,
                    availability: item.availability !== false,
                    rating: item.rating,
                    reviewCount: item.reviewCount
                });
            }
        }

        return categories;
    }

    /**
     * Gets match reasons for explanation
     * @private
     */
    getMatchReasons(imageFeatures, catalogItem, similarity) {
        const reasons = [];

        const imageColors = this.extractDominantColors(imageFeatures);
        const itemColors = catalogItem.tags.filter(tag =>
            ['black', 'white', 'blue', 'red', 'green', 'yellow', 'brown', 'gray', 'pink', 'purple'].includes(tag.toLowerCase())
        );

        // Color matches
        const colorMatches = imageColors.filter(color =>
            itemColors.some(itemColor => itemColor.toLowerCase() === color.toLowerCase())
        );
        if (colorMatches.length > 0) {
            reasons.push(`Similar colors: ${colorMatches.join(', ')}`);
        }

        // Category match
        const detectedCategories = this.extractDetectedCategories(imageFeatures);
        if (detectedCategories.includes(catalogItem.category)) {
            reasons.push(`Same category: ${catalogItem.category}`);
        }

        // Style match
        const imageStyle = imageFeatures.metadata?.overallStyle;
        if (imageStyle && catalogItem.tags.includes(imageStyle)) {
            reasons.push(`Similar style: ${imageStyle}`);
        }

        return reasons;
    }

    /**
     * Extracts detected categories from image features
     * @private
     */
    extractDetectedCategories(imageFeatures) {
        if (imageFeatures.metadata?.clothingItems) {
            return imageFeatures.metadata.clothingItems.map(item => item.category);
        }
        return [];
    }

    /**
     * Extracts dominant colors from image features
     * @private
     */
    extractDominantColors(imageFeatures) {
        return imageFeatures.metadata?.dominantColors || [];
    }
}

/**
 * Custom error class for recommendation errors
 */
export class RecommendationError extends Error {
    constructor(message, code, details = {}) {
        super(message);
        this.name = 'RecommendationError';
        this.code = code;
        this.details = details;
    }
}

// Export singleton instance
export const enhancedRecommendationService = new EnhancedRecommendationService();
export default enhancedRecommendationService;