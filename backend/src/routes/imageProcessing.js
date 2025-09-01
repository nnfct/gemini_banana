import express from 'express';
import imageProcessingService from '../services/imageProcessingService.js';

const router = express.Router();

/**
 * Process uploaded image
 * POST /api/image/process
 */
router.post('/process', async (req, res) => {
    try {
        const { image, options = {} } = req.body;

        if (!image) {
            return res.status(400).json({
                success: false,
                error: 'Image data is required',
                code: 'MISSING_IMAGE'
            });
        }

        // Process the image
        const result = await imageProcessingService.processImage(image, options);

        res.json({
            success: true,
            data: {
                processed: true,
                metadata: result.metadata,
                processingTime: result.processingTime
            }
        });

    } catch (error) {
        console.error('Image processing error:', error);

        if (error.name === 'ImageProcessingError') {
            return res.status(400).json({
                success: false,
                error: error.message,
                code: error.code,
                details: error.details
            });
        }

        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * Validate image without processing
 * POST /api/image/validate
 */
router.post('/validate', async (req, res) => {
    try {
        const { image } = req.body;

        if (!image) {
            return res.status(400).json({
                success: false,
                error: 'Image data is required',
                code: 'MISSING_IMAGE'
            });
        }

        // Parse and validate image
        const parsedImage = await imageProcessingService._parseImageData(image);
        const validation = await imageProcessingService.validateImage(parsedImage);

        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                error: validation.error,
                details: validation.details
            });
        }

        res.json({
            success: true,
            data: {
                valid: true,
                format: validation.format,
                dimensions: validation.dimensions,
                size: validation.size
            }
        });

    } catch (error) {
        console.error('Image validation error:', error);

        res.status(500).json({
            success: false,
            error: 'Failed to validate image',
            code: 'VALIDATION_ERROR'
        });
    }
});

/**
 * Get image metadata
 * POST /api/image/metadata
 */
router.post('/metadata', async (req, res) => {
    try {
        const { image } = req.body;

        if (!image) {
            return res.status(400).json({
                success: false,
                error: 'Image data is required',
                code: 'MISSING_IMAGE'
            });
        }

        const metadata = await imageProcessingService.getImageMetadata(image);

        res.json({
            success: true,
            data: metadata
        });

    } catch (error) {
        console.error('Metadata extraction error:', error);

        if (error.name === 'ImageProcessingError') {
            return res.status(400).json({
                success: false,
                error: error.message,
                code: error.code
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to extract metadata',
            code: 'METADATA_ERROR'
        });
    }
});

/**
 * Resize image
 * POST /api/image/resize
 */
router.post('/resize', async (req, res) => {
    try {
        const { image, width, height, maintainAspectRatio = true, quality = 85 } = req.body;

        if (!image) {
            return res.status(400).json({
                success: false,
                error: 'Image data is required',
                code: 'MISSING_IMAGE'
            });
        }

        // Parse image data first
        const parsedImage = await imageProcessingService._parseImageData(image);

        // Resize the image
        const result = await imageProcessingService.resizeImage(parsedImage, {
            width,
            height,
            maintainAspectRatio,
            quality
        });

        // Convert back to base64 for response
        const base64Result = imageProcessingService.toBase64(
            result.data.buffer,
            result.data.mimeType
        );

        res.json({
            success: true,
            data: {
                image: base64Result,
                metadata: result.metadata
            }
        });

    } catch (error) {
        console.error('Image resize error:', error);

        if (error.name === 'ImageProcessingError') {
            return res.status(400).json({
                success: false,
                error: error.message,
                code: error.code
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to resize image',
            code: 'RESIZE_ERROR'
        });
    }
});

/**
 * Get service configuration
 * GET /api/image/config
 */
router.get('/config', (req, res) => {
    try {
        const config = imageProcessingService.getConfig();

        res.json({
            success: true,
            data: config
        });

    } catch (error) {
        console.error('Config retrieval error:', error);

        res.status(500).json({
            success: false,
            error: 'Failed to retrieve configuration',
            code: 'CONFIG_ERROR'
        });
    }
});

export default router;