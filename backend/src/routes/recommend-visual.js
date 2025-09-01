import { Router } from 'express';
import { imageProcessingService } from '../services/imageProcessingService.js';
import { enhancedRecommendationService } from '../services/enhancedRecommendationService.js';

const router = Router();

/**
 * POST /api/recommend-visual
 * Visual similarity-based product recommendations
 */
router.post('/', async (req, res) => {
    const startTime = Date.now();

    try {
        const { image, options = {} } = req.body;

        // Validate request
        if (!image) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MISSING_IMAGE',
                    message: 'Image data is required'
                }
            });
        }

        console.log('🖼️  Processing visual recommendation request...');

        // Process image
        const processedImage = await imageProcessingService.processImage(image, {
            targetWidth: options.targetWidth || 224,
            targetHeight: options.targetHeight || 224
        });

        console.log('✅ Image processed successfully');

        // Extract visual features
        const provider = options.provider || 'auto';
        const imageFeatures = await imageProcessingService.extractFeatures(processedImage, provider);

        console.log(`🧠 Features extracted using ${imageFeatures.provider}`);

        // Get visual recommendations
        const recommendationOptions = {
            categories: options.categories,
            maxResults: options.maxResults || 10,
            minSimilarity: options.minSimilarity || 0.3,
            priceRange: options.priceRange,
            brands: options.brands
        };

        const recommendations = await enhancedRecommendationService.getVisualRecommendations(
            imageFeatures,
            recommendationOptions
        );

        const processingTime = Date.now() - startTime;

        console.log(`⚡ Visual recommendations generated in ${processingTime}ms`);

        // Return response
        res.json({
            success: true,
            processingTime,
            provider: imageFeatures.provider,
            recommendations: recommendations.recommendations,
            metadata: {
                ...recommendations.metadata,
                imageProcessing: {
                    originalDimensions: processedImage.originalDimensions,
                    targetDimensions: processedImage.targetDimensions,
                    processingTime: imageFeatures.processingTime
                },
                featureExtraction: {
                    provider: imageFeatures.provider,
                    model: imageFeatures.model,
                    dimensions: imageFeatures.dimensions
                }
            }
        });

    } catch (error) {
        console.error('Visual recommendation error:', error);

        const processingTime = Date.now() - startTime;

        // Handle specific error types
        if (error.name === 'ImageProcessingError') {
            return res.status(400).json({
                success: false,
                processingTime,
                error: {
                    code: error.code,
                    message: error.message,
                    type: 'IMAGE_PROCESSING_ERROR'
                }
            });
        }

        if (error.name === 'AzureVisionError') {
            // Try fallback to keyword-based recommendations
            try {
                console.log('🔄 Falling back to keyword-based recommendations...');
                const fallbackRecommendations = await getFallbackRecommendations(req.body);

                return res.json({
                    success: true,
                    processingTime,
                    provider: 'fallback',
                    recommendations: fallbackRecommendations,
                    metadata: {
                        fallbackReason: 'Azure service unavailable',
                        originalError: error.message
                    }
                });
            } catch (fallbackError) {
                console.error('Fallback also failed:', fallbackError);
            }
        }

        // Generic error response
        res.status(500).json({
            success: false,
            processingTime,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'An error occurred while processing your request',
                type: 'INTERNAL_SERVER_ERROR'
            }
        });
    }
});

/**
 * GET /api/recommend-visual/health
 * Health check for visual recommendation service
 */
router.get('/health', async (req, res) => {
    try {
        const { azureComputerVisionService } = await import('../services/azureComputerVisionService.js');

        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                imageProcessing: 'available',
                azure: azureComputerVisionService.isAvailable() ? 'available' : 'unavailable',
                local: 'mock_available',
                recommendations: 'available'
            }
        };

        res.json(health);
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

/**
 * Fallback to keyword-based recommendations when visual analysis fails
 * @private
 */
async function getFallbackRecommendations(requestBody) {
    // Import the original recommendation service
    const { recommendSimilarItems } = await import('../../../api/recommend.js');

    // Use the original mock recommendation logic
    const result = await recommendSimilarItems(null, {});

    // Convert to new format
    const recommendations = {
        top: result.recommendations.filter(item =>
            item.tags?.some(tag => ['hoodie', 'shirt', 't-shirt', 'top'].includes(tag.toLowerCase()))
        ).slice(0, 3),
        pants: result.recommendations.filter(item =>
            item.tags?.some(tag => ['jeans', 'pants', 'slacks'].includes(tag.toLowerCase()))
        ).slice(0, 3),
        shoes: result.recommendations.filter(item =>
            item.tags?.some(tag => ['shoes', 'sneakers', 'boots'].includes(tag.toLowerCase()))
        ).slice(0, 3),
        accessories: []
    };

    return recommendations;
}

export default router;