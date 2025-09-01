import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Product Catalog Service for managing product data and recommendations
 * Provides standardized interface for product search, filtering, and scoring
 */
class CatalogService {
    constructor() {
        this.catalog = [];
        this.config = {
            catalogPath: join(__dirname, '../../../data/catalog.json'),
            maxRecommendations: 10,
            scoreThreshold: 0,
            categories: ['top', 'pants', 'shoes', 'accessories']
        };
        this._loadCatalog();
    }

    /**
     * Load catalog data from JSON file
     * @private
     */
    _loadCatalog() {
        try {
            const catalogData = readFileSync(this.config.catalogPath, 'utf8');
            this.catalog = JSON.parse(catalogData);
            console.log(`Loaded ${this.catalog.length} products from catalog`);
        } catch (error) {
            console.error('Failed to load catalog:', error);
            this.catalog = [];
        }
    }

    /**
     * Reload catalog data from file
     * @returns {boolean} True if reload was successful
     */
    reloadCatalog() {
        try {
            this._loadCatalog();
            return true;
        } catch (error) {
            console.error('Failed to reload catalog:', error);
            return false;
        }
    }

    /**
     * Get all products in catalog
     * @returns {Array} Array of all products
     */
    getAllProducts() {
        return [...this.catalog];
    }

    /**
     * Get product by ID
     * @param {string} productId - Product ID
     * @returns {Object|null} Product object or null if not found
     */
    getProductById(productId) {
        return this.catalog.find(product => product.id === productId) || null;
    }

    /**
     * Get products by category
     * @param {string} category - Product category
     * @returns {Array} Array of products in the category
     */
    getProductsByCategory(category) {
        return this.catalog.filter(product => product.category === category);
    }

    /**
     * Search products by keywords
     * @param {Array|string} keywords - Keywords to search for
     * @param {Object} options - Search options
     * @returns {Array} Array of matching products with scores
     */
    searchProducts(keywords, options = {}) {
        const {
            categories = this.config.categories,
            maxResults = this.config.maxRecommendations,
            scoreThreshold = this.config.scoreThreshold
        } = options;

        // Normalize keywords
        const searchKeywords = Array.isArray(keywords) ? keywords : [keywords];
        const normalizedKeywords = searchKeywords.map(k => k.toLowerCase().trim());

        // Score and filter products
        const scoredProducts = this.catalog
            .filter(product => categories.includes(product.category))
            .map(product => ({
                ...product,
                score: this._calculateProductScore(product, normalizedKeywords)
            }))
            .filter(product => product.score > scoreThreshold)
            .sort((a, b) => b.score - a.score)
            .slice(0, maxResults);

        return scoredProducts;
    }

    /**
     * Find similar products based on analysis keywords
     * @param {Object} analysis - Analysis result with clothing characteristics
     * @param {Object} options - Search options
     * @returns {Object} Categorized recommendations
     */
    findSimilarProducts(analysis, options = {}) {
        const {
            maxPerCategory = 3,
            includeScore = true
        } = options;

        // Extract all keywords from analysis
        const allKeywords = this._extractKeywordsFromAnalysis(analysis);

        const recommendations = {
            top: [],
            pants: [],
            shoes: [],
            accessories: []
        };

        // Search for each category
        this.config.categories.forEach(category => {
            const categoryProducts = this.searchProducts(allKeywords, {
                categories: [category],
                maxResults: maxPerCategory * 2, // Get more to ensure variety
                scoreThreshold: 0
            });

            // Take top results for this category
            recommendations[category] = categoryProducts
                .slice(0, maxPerCategory)
                .map(product => includeScore ? product : this._removeScore(product));
        });

        return recommendations;
    }

    /**
     * Generate recommendations based on style preferences
     * @param {Array} styleKeywords - Style preference keywords
     * @param {Object} options - Recommendation options
     * @returns {Array} Array of recommended products
     */
    getRecommendationsByStyle(styleKeywords, options = {}) {
        const {
            maxResults = this.config.maxRecommendations,
            diversify = true
        } = options;

        let recommendations = this.searchProducts(styleKeywords, {
            maxResults: maxResults * 2 // Get more for diversification
        });

        // Diversify by category if requested
        if (diversify) {
            recommendations = this._diversifyRecommendations(recommendations, maxResults);
        } else {
            recommendations = recommendations.slice(0, maxResults);
        }

        return recommendations;
    }

    /**
     * Filter products by price range
     * @param {Array} products - Products to filter
     * @param {number} minPrice - Minimum price
     * @param {number} maxPrice - Maximum price
     * @returns {Array} Filtered products
     */
    filterByPriceRange(products, minPrice = 0, maxPrice = Infinity) {
        return products.filter(product =>
            product.price >= minPrice && product.price <= maxPrice
        );
    }

    /**
     * Filter products by tags
     * @param {Array} products - Products to filter
     * @param {Array} requiredTags - Tags that must be present
     * @param {Array} excludedTags - Tags that must not be present
     * @returns {Array} Filtered products
     */
    filterByTags(products, requiredTags = [], excludedTags = []) {
        return products.filter(product => {
            const productTags = product.tags.map(tag => tag.toLowerCase());

            // Check required tags
            const hasRequiredTags = requiredTags.length === 0 ||
                requiredTags.every(tag => productTags.includes(tag.toLowerCase()));

            // Check excluded tags
            const hasExcludedTags = excludedTags.some(tag =>
                productTags.includes(tag.toLowerCase())
            );

            return hasRequiredTags && !hasExcludedTags;
        });
    }

    /**
     * Get product statistics
     * @returns {Object} Catalog statistics
     */
    getStatistics() {
        const stats = {
            totalProducts: this.catalog.length,
            categories: {},
            priceRange: {
                min: Infinity,
                max: 0,
                average: 0
            }
        };

        let totalPrice = 0;

        this.catalog.forEach(product => {
            // Category stats
            stats.categories[product.category] = (stats.categories[product.category] || 0) + 1;

            // Price stats
            stats.priceRange.min = Math.min(stats.priceRange.min, product.price);
            stats.priceRange.max = Math.max(stats.priceRange.max, product.price);
            totalPrice += product.price;
        });

        stats.priceRange.average = Math.round(totalPrice / this.catalog.length);

        if (stats.priceRange.min === Infinity) {
            stats.priceRange.min = 0;
        }

        return stats;
    }

    /**
     * Calculate product score based on keywords
     * @private
     * @param {Object} product - Product to score
     * @param {Array} keywords - Keywords to match against
     * @returns {number} Product score
     */
    _calculateProductScore(product, keywords) {
        const productText = `${product.title.toLowerCase()} ${product.tags.join(' ')}`;
        let score = 0;

        keywords.forEach(keyword => {
            if (productText.includes(keyword)) {
                // Exact tag match gets higher score
                if (product.tags.some(tag => tag.toLowerCase() === keyword)) {
                    score += 2;
                } else {
                    // Partial match in title or tags
                    score += 1;
                }
            }
        });

        return score;
    }

    /**
     * Extract keywords from analysis result
     * @private
     * @param {Object} analysis - Analysis result
     * @returns {Array} Array of keywords
     */
    _extractKeywordsFromAnalysis(analysis) {
        const keywords = [];

        // Extract from all analysis categories
        Object.values(analysis).forEach(value => {
            if (Array.isArray(value)) {
                keywords.push(...value);
            }
        });

        return keywords.filter(keyword => keyword && typeof keyword === 'string');
    }

    /**
     * Remove score property from product
     * @private
     * @param {Object} product - Product with score
     * @returns {Object} Product without score
     */
    _removeScore(product) {
        const { score, ...productWithoutScore } = product;
        return productWithoutScore;
    }

    /**
     * Diversify recommendations by category
     * @private
     * @param {Array} recommendations - Recommendations to diversify
     * @param {number} maxResults - Maximum number of results
     * @returns {Array} Diversified recommendations
     */
    _diversifyRecommendations(recommendations, maxResults) {
        const diversified = [];
        const categoryGroups = {};

        // Group by category
        recommendations.forEach(product => {
            if (!categoryGroups[product.category]) {
                categoryGroups[product.category] = [];
            }
            categoryGroups[product.category].push(product);
        });

        // Round-robin selection from categories
        const categories = Object.keys(categoryGroups);
        let categoryIndex = 0;

        while (diversified.length < maxResults && categories.length > 0) {
            const category = categories[categoryIndex];
            const categoryProducts = categoryGroups[category];

            if (categoryProducts.length > 0) {
                diversified.push(categoryProducts.shift());
            }

            // Remove empty categories
            if (categoryProducts.length === 0) {
                categories.splice(categoryIndex, 1);
                if (categoryIndex >= categories.length) {
                    categoryIndex = 0;
                }
            } else {
                categoryIndex = (categoryIndex + 1) % categories.length;
            }
        }

        return diversified;
    }

    /**
     * Update service configuration
     * @param {Object} newConfig - New configuration options
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };

        // Reload catalog if path changed
        if (newConfig.catalogPath) {
            this._loadCatalog();
        }
    }

    /**
     * Get current service configuration
     * @returns {Object} Current configuration
     */
    getConfig() {
        return {
            ...this.config,
            catalogLoaded: this.catalog.length > 0,
            lastLoadTime: new Date().toISOString()
        };
    }

    /**
     * Add product to catalog (for future database integration)
     * @param {Object} product - Product to add
     * @returns {boolean} True if product was added successfully
     */
    addProduct(product) {
        // Validate product structure
        if (!this._validateProduct(product)) {
            return false;
        }

        // Check for duplicate ID
        if (this.getProductById(product.id)) {
            console.warn(`Product with ID ${product.id} already exists`);
            return false;
        }

        this.catalog.push(product);
        return true;
    }

    /**
     * Update product in catalog (for future database integration)
     * @param {string} productId - Product ID to update
     * @param {Object} updates - Product updates
     * @returns {boolean} True if product was updated successfully
     */
    updateProduct(productId, updates) {
        const productIndex = this.catalog.findIndex(p => p.id === productId);

        if (productIndex === -1) {
            return false;
        }

        const updatedProduct = { ...this.catalog[productIndex], ...updates };

        if (!this._validateProduct(updatedProduct)) {
            return false;
        }

        this.catalog[productIndex] = updatedProduct;
        return true;
    }

    /**
     * Remove product from catalog (for future database integration)
     * @param {string} productId - Product ID to remove
     * @returns {boolean} True if product was removed successfully
     */
    removeProduct(productId) {
        const productIndex = this.catalog.findIndex(p => p.id === productId);

        if (productIndex === -1) {
            return false;
        }

        this.catalog.splice(productIndex, 1);
        return true;
    }

    /**
     * Validate product structure
     * @private
     * @param {Object} product - Product to validate
     * @returns {boolean} True if product is valid
     */
    _validateProduct(product) {
        const requiredFields = ['id', 'title', 'tags', 'price', 'category'];

        return requiredFields.every(field => {
            if (!(field in product)) {
                console.error(`Product missing required field: ${field}`);
                return false;
            }
            return true;
        }) && Array.isArray(product.tags) && typeof product.price === 'number';
    }
}

// Export singleton instance
const catalogService = new CatalogService();
export default catalogService;

// Export class for testing
export { CatalogService };