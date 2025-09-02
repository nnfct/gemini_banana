import { Router } from 'express';
import openaiService from '../services/openai.service.js';
import catalogService from '../services/catalog.service.js';
import { validateRequiredFields, validateFileUpload, ValidationError } from '../middleware/validation.js';
import { ApiError, ApiErrors, asyncHandler } from '../middleware/error.js';
import {
    validateRecommendationRequest,
    validateRecommendationFromFittingRequest,
    createApiResponse,
    createApiError
} from '../types/api.types.js';

/**
 * Recommendation API routes
 * Handles product recommendations based on images and virtual try-on results
 */

const router = Router();

/**
 * @api {post} /api/recommend Generate recommendations from uploaded images
 * @apiName GetRecommendationsFromUpload
 * @apiGroup Recommendations
 * @apiVersion 1.0.0
 * 
 * @apiDescription Analyzes uploaded person and/or clothing images to generate style-based product recommendations.
 * 
 * @apiBody {Object} [person] Person image data for style analysis
 * @apiBody {String} [person.base64] Base64 encoded image data (without data URI prefix)
 * @apiBody {String} [person.mimeType] MIME type of the image (image/jpeg, image/png, image/webp)
 * @apiBody {Object} [clothingItems] Clothing items for style analysis
 * @apiBody {Object} [clothingItems.top] Top clothing item
 * @apiBody {String} [clothingItems.top.base64] Base64 encoded image data
 * @apiBody {String} [clothingItems.top.mimeType] MIME type of the image
 * @apiBody {Object} [clothingItems.pants] Pants clothing item
 * @apiBody {String} [clothingItems.pants.base64] Base64 encoded image data
 * @apiBody {String} [clothingItems.pants.mimeType] MIME type of the image
 * @apiBody {Object} [clothingItems.shoes] Shoes clothing item
 * @apiBody {String} [clothingItems.shoes.base64] Base64 encoded image data
 * @apiBody {String} [clothingItems.shoes.mimeType] MIME type of the image
 * @apiBody {Object} [options] Recommendation options
 * @apiBody {Number} [options.maxPerCategory=3] Maximum recommendations per category
 * @apiBody {Number} [options.minPrice] Minimum price filter
 * @apiBody {Number} [options.maxPrice] Maximum price filter
 * @apiBody {String[]} [options.excludeTags] Tags to exclude from recommendations
 * 
 * @apiExample {json} Request Example:
 * {
 *   "person": {
 *     "base64": "/9j/4AAQSkZJRgABAQAAAQABAAD...",
 *     "mimeType": "image/jpeg"
 *   },
 *   "clothingItems": {
 *     "top": {
 *       "base64": "/9j/4AAQSkZJRgABAQAAAQABAAD...",
 *       "mimeType": "image/jpeg"
 *     }
 *   },
 *   "options": {
 *     "maxPerCategory": 5,
 *     "maxPrice": 100000
 *   }
 * }
 * 
 * @apiSuccess {Object} recommendations Categorized product recommendations
 * @apiSuccess {Object[]} recommendations.top Top clothing recommendations
 * @apiSuccess {Object[]} recommendations.pants Pants recommendations
 * @apiSuccess {Object[]} recommendations.shoes Shoes recommendations
 * @apiSuccess {Object[]} recommendations.accessories Accessories recommendations
 * @apiSuccess {String} analysisMethod Method used for analysis (ai/fallback)
 * @apiSuccess {Object} [styleAnalysis] Style analysis result (if AI analysis was used)
 * @apiSuccess {String} requestId Unique identifier for the request
 * @apiSuccess {String} timestamp ISO timestamp of the response
 * 
 * @apiSuccessExample {json} Success Response:
 * HTTP/1.1 200 OK
 * {
 *   "recommendations": {
 *     "top": [
 *       {
 *         "id": "top_001",
 *         "title": "Casual Cotton T-Shirt",
 *         "price": 25000,
 *         "imageUrl": "https://example.com/image.jpg",
 *         "tags": ["casual", "cotton", "basic"],
 *         "category": "top"
 *       }
 *     ],
 *     "pants": [...],
 *     "shoes": [...],
 *     "accessories": [...]
 *   },
 *   "analysisMethod": "ai",
 *   "styleAnalysis": {
 *     "detected_style": ["casual", "street"],
 *     "colors": ["black", "white"],
 *     "categories": ["top"],
 *     "style_preference": ["casual", "comfortable"]
 *   },
 *   "requestId": "req_1234567890_abc123",
 *   "timestamp": "2024-01-15T10:30:00.000Z"
 * }
 * 
 * @apiError (400) ValidationError Invalid request data
 * @apiError (500) ServiceError Analysis or recommendation service error
 * 
 * @apiErrorExample {json} Validation Error:
 * HTTP/1.1 400 Bad Request
 * {
 *   "error": {
 *     "message": "At least person image or clothing items are required",
 *     "code": "MISSING_INPUT_DATA"
 *   }
 * }
 */
router.post('/', [
    // Schema validation using type definitions
    (req, res, next) => {
        try {
            validateRecommendationRequest(req.body);
            next();
        } catch (error) {
            next(ApiErrors.badRequest(error.message, { field: 'request_body' }));
        }
    },

    // Additional file upload validation
    validateFileUpload({
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
        maxSize: 10 * 1024 * 1024 // 10MB
    })
], asyncHandler(async (req, res, next) => {
    try {
        const { person, clothingItems = {}, options = {} } = req.body;
        const {
            maxPerCategory = 3,
            minPrice,
            maxPrice,
            excludeTags = []
        } = options;

        // Log request for debugging (in development)
        if (process.env.NODE_ENV === 'development') {
            console.log(`?뵇 Generating recommendations from upload [${req.id}]`);
            console.log(`   Person: ${person ? person.mimeType : 'none'}`);
            console.log(`   Clothing items: ${Object.keys(clothingItems).join(', ') || 'none'}`);
        }

        let styleAnalysis = null;
        let analysisMethod = 'fallback';

        // Try AI analysis first if Azure OpenAI is available
        if (openaiService.isAvailable()) {
            try {
                styleAnalysis = await openaiService.analyzeStyleFromImages(person, clothingItems);
                analysisMethod = 'ai';

                if (process.env.NODE_ENV === 'development') {
                    console.log('??AI style analysis completed');
                }
            } catch (error) {
                console.warn('AI style analysis failed, using fallback:', error.message);
                styleAnalysis = generateFallbackStyleAnalysis(person, clothingItems);
            }
        } else {
            console.log('Azure OpenAI not configured, using fallback analysis');
            styleAnalysis = generateFallbackStyleAnalysis(person, clothingItems);
        }

        // Generate recommendations based on style analysis
        let recommendations;

        if (analysisMethod === 'ai' && styleAnalysis) {
            // Use AI analysis for recommendations
            recommendations = catalogService.findSimilarProducts(styleAnalysis, {
                maxPerCategory,
                includeScore: false
            });
        } else {
            // Use fallback recommendation logic
            const fallbackKeywords = extractFallbackKeywords(person, clothingItems);
            const allRecommendations = catalogService.getRecommendationsByStyle(fallbackKeywords, {
                maxResults: maxPerCategory * 4,
                diversify: true
            });

            // Organize into categories
            recommendations = organizeByCategoryFallback(allRecommendations, maxPerCategory);
        }

        // Apply filters if specified
        if (minPrice !== undefined || maxPrice !== undefined || excludeTags.length > 0) {
            recommendations = applyFiltersToRecommendations(recommendations, {
                minPrice,
                maxPrice,
                excludeTags
            });
        }

        // Success response
        const responseData = {
            recommendations,
            analysisMethod
        };

        // Include style analysis in response if AI was used
        if (analysisMethod === 'ai' && styleAnalysis) {
            responseData.styleAnalysis = styleAnalysis;
        }

        res.json(createApiResponse(responseData, req.id, req.timestamp));

        // Log success (in development)
        if (process.env.NODE_ENV === 'development') {
            const totalRecommendations = Object.values(recommendations).reduce((sum, items) => sum + items.length, 0);
            console.log(`??Generated ${totalRecommendations} recommendations [${req.id}]`);
        }

    } catch (error) {
        // If it's already an ApiError, re-throw it
        if (error instanceof ApiError) {
            throw error;
        }

        // Generic recommendation error
        throw ApiErrors.internalServer('Failed to generate recommendations');
    }
}));

/**
 * @api {post} /api/recommend/from-fitting Generate recommendations from virtual try-on result
 * @apiName GetRecommendationsFromFitting
 * @apiGroup Recommendations
 * @apiVersion 1.0.0
 * 
 * @apiDescription Analyzes a virtual try-on result image to generate product recommendations based on the fitted clothing.
 * 
 * @apiBody {String} generatedImage Base64 data URI of the virtual try-on result image
 * @apiBody {Object} [originalClothingItems] Original clothing items used in virtual try-on for context
 * @apiBody {Object} [originalClothingItems.top] Original top item
 * @apiBody {Object} [originalClothingItems.pants] Original pants item
 * @apiBody {Object} [originalClothingItems.shoes] Original shoes item
 * @apiBody {Object} [options] Recommendation options
 * @apiBody {Number} [options.maxPerCategory=3] Maximum recommendations per category
 * @apiBody {Number} [options.minPrice] Minimum price filter
 * @apiBody {Number} [options.maxPrice] Maximum price filter
 * @apiBody {String[]} [options.excludeTags] Tags to exclude from recommendations
 * 
 * @apiExample {json} Request Example:
 * {
 *   "generatedImage": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...",
 *   "originalClothingItems": {
 *     "top": {
 *       "base64": "/9j/4AAQSkZJRgABAQAAAQABAAD...",
 *       "mimeType": "image/jpeg"
 *     }
 *   },
 *   "options": {
 *     "maxPerCategory": 4
 *   }
 * }
 * 
 * @apiSuccess {Object} recommendations Categorized product recommendations
 * @apiSuccess {Object[]} recommendations.top Top clothing recommendations
 * @apiSuccess {Object[]} recommendations.pants Pants recommendations
 * @apiSuccess {Object[]} recommendations.shoes Shoes recommendations
 * @apiSuccess {Object[]} recommendations.accessories Accessories recommendations
 * @apiSuccess {String} analysisMethod Method used for analysis (ai/fallback)
 * @apiSuccess {Object} [clothingAnalysis] Clothing analysis result (if AI analysis was used)
 * @apiSuccess {String} requestId Unique identifier for the request
 * @apiSuccess {String} timestamp ISO timestamp of the response
 * 
 * @apiSuccessExample {json} Success Response:
 * HTTP/1.1 200 OK
 * {
 *   "recommendations": {
 *     "top": [...],
 *     "pants": [...],
 *     "shoes": [...],
 *     "accessories": [...]
 *   },
 *   "analysisMethod": "ai",
 *   "clothingAnalysis": {
 *     "top": ["black", "hoodie", "oversized"],
 *     "pants": ["blue", "jeans", "straight"],
 *     "shoes": ["white", "sneakers"],
 *     "overall_style": ["casual", "street"]
 *   },
 *   "requestId": "req_1234567890_abc123",
 *   "timestamp": "2024-01-15T10:30:00.000Z"
 * }
 * 
 * @apiError (400) ValidationError Invalid request data
 * @apiError (500) ServiceError Analysis or recommendation service error
 */
router.post('/from-fitting', [
    // Schema validation using type definitions
    (req, res, next) => {
        try {
            validateRecommendationFromFittingRequest(req.body);
            next();
        } catch (error) {
            next(ApiErrors.badRequest(error.message, { field: 'request_body' }));
        }
    }
], asyncHandler(async (req, res, next) => {
    try {
        const { generatedImage, originalClothingItems = {}, options = {} } = req.body;
        const {
            maxPerCategory = 3,
            minPrice,
            maxPrice,
            excludeTags = []
        } = options;

        // Extract base64 data and MIME type from data URI
        const [header, base64Data] = generatedImage.split(',');
        const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';

        // Log request for debugging (in development)
        if (process.env.NODE_ENV === 'development') {
            console.log(`?뵇 Generating recommendations from virtual try-on [${req.id}]`);
            console.log(`   Generated image: ${mimeType}`);
            console.log(`   Original items: ${Object.keys(originalClothingItems).join(', ') || 'none'}`);
        }

        let clothingAnalysis = null;
        let analysisMethod = 'fallback';

        // Try AI analysis first if Azure OpenAI is available
        if (openaiService.isAvailable()) {
            try {
                clothingAnalysis = await openaiService.analyzeVirtualTryOnImage(
                    base64Data,
                    mimeType,
                    originalClothingItems
                );
                analysisMethod = 'ai';

                if (process.env.NODE_ENV === 'development') {
                    console.log('??AI clothing analysis completed');
                }
            } catch (error) {
                console.warn('AI clothing analysis failed, using fallback:', error.message);
                clothingAnalysis = openaiService.generateFallbackAnalysis(originalClothingItems);
            }
        } else {
            console.log('Azure OpenAI not configured, using fallback analysis');
            clothingAnalysis = openaiService.generateFallbackAnalysis(originalClothingItems);
        }

        // Generate recommendations based on clothing analysis
        const recommendations = catalogService.findSimilarProducts(clothingAnalysis, {
            maxPerCategory,
            includeScore: false
        });

        // Apply filters if specified
        const filteredRecommendations = (minPrice !== undefined || maxPrice !== undefined || excludeTags.length > 0)
            ? applyFiltersToRecommendations(recommendations, { minPrice, maxPrice, excludeTags })
            : recommendations;

        // Success response
        const responseData = {
            recommendations: filteredRecommendations,
            analysisMethod
        };

        // Include clothing analysis in response if AI was used
        if (analysisMethod === 'ai' && clothingAnalysis) {
            responseData.clothingAnalysis = clothingAnalysis;
        }

        res.json(createApiResponse(responseData, req.id, req.timestamp));

        // Log success (in development)
        if (process.env.NODE_ENV === 'development') {
            const totalRecommendations = Object.values(filteredRecommendations).reduce((sum, items) => sum + items.length, 0);
            console.log(`??Generated ${totalRecommendations} recommendations from fitting [${req.id}]`);
        }

    } catch (error) {
        // If it's already an ApiError, re-throw it
        if (error instanceof ApiError) {
            throw error;
        }

        // Generic fitting recommendation error
        throw ApiErrors.internalServer('Failed to generate recommendations from virtual try-on result');
    }
}));

/**
 * @api {get} /api/recommend/catalog Get catalog statistics
 * @apiName GetCatalogStats
 * @apiGroup Recommendations
 * @apiVersion 1.0.0
 * 
 * @apiDescription Returns statistics about the product catalog.
 * 
 * @apiSuccess {Number} totalProducts Total number of products in catalog
 * @apiSuccess {Object} categories Product count by category
 * @apiSuccess {Object} priceRange Price range information
 * @apiSuccess {Number} priceRange.min Minimum price
 * @apiSuccess {Number} priceRange.max Maximum price
 * @apiSuccess {Number} priceRange.average Average price
 * 
 * @apiSuccessExample {json} Success Response:
 * HTTP/1.1 200 OK
 * {
 *   "totalProducts": 150,
 *   "categories": {
 *     "top": 45,
 *     "pants": 35,
 *     "shoes": 40,
 *     "accessories": 30
 *   },
 *   "priceRange": {
 *     "min": 15000,
 *     "max": 250000,
 *     "average": 65000
 *   }
 * }
 */
router.get('/catalog', asyncHandler(async (req, res) => {
    const stats = catalogService.getStatistics();
    res.json(stats);
}));

/**
 * @api {get} /api/recommend/status Get recommendation service status
 * @apiName GetRecommendServiceStatus
 * @apiGroup Recommendations
 * @apiVersion 1.0.0
 * 
 * @apiDescription Returns the current status of the recommendation services.
 * 
 * @apiSuccess {Object} aiService Azure OpenAI service status
 * @apiSuccess {Boolean} aiService.available Whether AI analysis is available
 * @apiSuccess {Object} aiService.config AI service configuration
 * @apiSuccess {Object} catalogService Catalog service status
 * @apiSuccess {Boolean} catalogService.available Whether catalog is loaded
 * @apiSuccess {Number} catalogService.productCount Number of products in catalog
 * 
 * @apiSuccessExample {json} Success Response:
 * HTTP/1.1 200 OK
 * {
 *   "aiService": {
 *     "available": true,
 *     "config": {
 *       "deploymentId": "gpt-4-vision-preview",
 *       "timeout": 30000,
 *       "isConfigured": true
 *     }
 *   },
 *   "catalogService": {
 *     "available": true,
 *     "productCount": 150
 *   }
 * }
 */
router.get('/status', asyncHandler(async (req, res) => {
    const aiConfig = openaiService.getConfig();
    const catalogStats = catalogService.getStatistics();

    res.json({
        aiService: {
            available: openaiService.isAvailable(),
            config: aiConfig
        },
        catalogService: {
            available: catalogStats.totalProducts > 0,
            productCount: catalogStats.totalProducts
        }
    });
}));

// Helper functions

/**
 * Generate fallback style analysis when AI is not available
 * @param {Object} person - Person image data
 * @param {Object} clothingItems - Clothing items
 * @returns {Object} Fallback style analysis
 */
function generateFallbackStyleAnalysis(person, clothingItems) {
    const analysis = {
        detected_style: ['casual', 'everyday'],
        colors: ['neutral'],
        categories: [],
        style_preference: ['comfortable', 'practical']
    };

    // Add categories based on provided items
    if (person) {
        analysis.categories.push('person');
        analysis.detected_style.push('personal');
    }

    Object.keys(clothingItems).forEach(category => {
        if (clothingItems[category]) {
            analysis.categories.push(category);
        }
    });

    return analysis;
}

/**
 * Extract keywords for fallback recommendations
 * @param {Object} person - Person image data
 * @param {Object} clothingItems - Clothing items
 * @returns {Array} Array of keywords
 */
function extractFallbackKeywords(person, clothingItems) {
    const keywords = ['casual', 'comfortable', 'everyday'];

    // Add category-specific keywords
    Object.keys(clothingItems).forEach(category => {
        if (clothingItems[category]) {
            keywords.push(category, 'basic', 'versatile');
        }
    });

    return keywords;
}

/**
 * Organize recommendations by category for fallback method
 * @param {Array} recommendations - Array of recommendations
 * @param {number} maxPerCategory - Maximum items per category
 * @returns {Object} Categorized recommendations
 */
function organizeByCategoryFallback(recommendations, maxPerCategory) {
    const organized = {
        top: [],
        pants: [],
        shoes: [],
        accessories: []
    };

    recommendations.forEach(item => {
        const category = item.category;
        if (organized[category] && organized[category].length < maxPerCategory) {
            organized[category].push(item);
        }
    });

    return organized;
}

/**
 * Apply filters to categorized recommendations
 * @param {Object} recommendations - Categorized recommendations
 * @param {Object} filters - Filter options
 * @returns {Object} Filtered recommendations
 */
function applyFiltersToRecommendations(recommendations, filters) {
    const { minPrice, maxPrice, excludeTags } = filters;
    const filtered = {};

    Object.keys(recommendations).forEach(category => {
        let categoryItems = recommendations[category];

        // Apply price filter
        if (minPrice !== undefined || maxPrice !== undefined) {
            categoryItems = catalogService.filterByPriceRange(
                categoryItems,
                minPrice,
                maxPrice
            );
        }

        // Apply tag filter
        if (excludeTags.length > 0) {
            categoryItems = catalogService.filterByTags(
                categoryItems,
                [], // no required tags
                excludeTags
            );
        }

        filtered[category] = categoryItems;
    });

    return filtered;
}


/**
 * @api {get} /api/recommend/random Get random products
 * @apiName GetRandomProducts
 * @apiGroup Recommendations
 * @apiVersion 1.0.0
 *
 * @apiDescription Returns a random list of products from the catalog.
 *
 * @apiQuery {Number} [limit=18] Number of products to return
 * @apiQuery {String} [category] Optional category filter (top|pants|shoes)
 */
router.get('/random', asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 18, 100);
    const category = (req.query.category || '').toString();

    let products = catalogService.getAllProducts();
    if (category && ['top','pants','shoes','accessories'].includes(category)) {
        products = products.filter(p => p.category === category);
    }

    // Shuffle and take limit
    for (let i = products.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [products[i], products[j]] = [products[j], products[i]];
    }

    res.json(products.slice(0, limit));
}));
export default router;

