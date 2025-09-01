# Image Processing Service Documentation

## Overview

The Image Processing Service provides a comprehensive solution for handling image validation, preprocessing, and format conversion in the AI Virtual Try-On application. It processes images entirely in memory without disk storage, supporting multiple formats and providing a foundation for visual recommendation features.

## Features

- **Memory-only processing**: No images are stored on disk
- **Multi-format support**: JPEG, PNG, WebP, GIF
- **Image validation**: Format, size, and dimension validation
- **Automatic resizing**: Configurable image resizing with aspect ratio preservation
- **Metadata extraction**: Comprehensive image metadata extraction
- **Error handling**: Detailed error reporting with specific error codes
- **Base64 conversion**: Seamless conversion between formats

## Service Configuration

### Default Configuration

```javascript
{
    supportedFormats: ['jpeg', 'jpg', 'png', 'webp', 'gif'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxWidth: 2048,
    maxHeight: 2048,
    defaultWidth: 224,  // Optimal for AI models
    defaultHeight: 224,
    quality: 85,
    minWidth: 32,
    minHeight: 32
}
```

### Updating Configuration

```javascript
import imageProcessingService from './services/imageProcessingService.js';

imageProcessingService.updateConfig({
    maxFileSize: 5 * 1024 * 1024, // 5MB
    defaultWidth: 512,
    defaultHeight: 512
});
```

## API Usage

### Basic Image Processing

```javascript
import imageProcessingService from './services/imageProcessingService.js';

// Process an image with default options
const result = await imageProcessingService.processImage(imageData);

// Process with custom options
const result = await imageProcessingService.processImage(imageData, {
    resize: true,
    targetWidth: 512,
    targetHeight: 512,
    optimize: true
});
```

### Image Validation

```javascript
// Validate image format and dimensions
const validation = await imageProcessingService.validateImage(parsedImageData);

if (!validation.isValid) {
    console.error('Validation failed:', validation.error);
    console.log('Details:', validation.details);
}
```

### Format Conversion

```javascript
// Convert buffer to base64
const base64Image = imageProcessingService.toBase64(buffer, 'image/jpeg');

// Convert base64 to buffer
const { buffer, mimeType, size } = imageProcessingService.fromBase64(base64Image);
```

### Metadata Extraction

```javascript
// Get comprehensive image metadata
const metadata = await imageProcessingService.getImageMetadata(imageData);

console.log('Format:', metadata.format);
console.log('Dimensions:', metadata.dimensions);
console.log('Aspect Ratio:', metadata.aspectRatio);
```

### Image Resizing

```javascript
// Resize with default settings
const resized = await imageProcessingService.resizeImage(imageData);

// Resize with custom options
const resized = await imageProcessingService.resizeImage(imageData, {
    width: 1024,
    height: 768,
    maintainAspectRatio: true,
    quality: 90
});
```

## REST API Endpoints

### POST /api/image/process

Process an uploaded image with optional preprocessing.

**Request:**
```json
{
    "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...",
    "options": {
        "resize": true,
        "targetWidth": 512,
        "targetHeight": 512,
        "optimize": true
    }
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "processed": true,
        "metadata": {
            "originalSize": 1024000,
            "originalFormat": "jpeg",
            "operations": ["resize", "optimize"],
            "processingTime": 45
        },
        "processingTime": 45
    }
}
```

### POST /api/image/validate

Validate image format and dimensions without processing.

**Request:**
```json
{
    "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD..."
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "valid": true,
        "format": "jpeg",
        "dimensions": {
            "width": 1920,
            "height": 1080
        },
        "size": 1024000
    }
}
```

### POST /api/image/metadata

Extract comprehensive metadata from an image.

**Request:**
```json
{
    "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD..."
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "format": "jpeg",
        "mimeType": "image/jpeg",
        "size": 1024000,
        "dimensions": {
            "width": 1920,
            "height": 1080
        },
        "aspectRatio": 1.777
    }
}
```

### POST /api/image/resize

Resize an image to specified dimensions.

**Request:**
```json
{
    "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...",
    "width": 512,
    "height": 384,
    "maintainAspectRatio": true,
    "quality": 85
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...",
        "metadata": {
            "resized": true,
            "targetDimensions": {
                "width": 512,
                "height": 384
            }
        }
    }
}
```

### GET /api/image/config

Get current service configuration.

**Response:**
```json
{
    "success": true,
    "data": {
        "supportedFormats": ["jpeg", "jpg", "png", "webp", "gif"],
        "maxFileSize": 10485760,
        "maxWidth": 2048,
        "maxHeight": 2048,
        "defaultWidth": 224,
        "defaultHeight": 224,
        "quality": 85,
        "minWidth": 32,
        "minHeight": 32
    }
}
```

## Error Handling

### Error Types

The service uses custom `ImageProcessingError` objects with specific error codes:

- `VALIDATION_FAILED`: Image validation failed
- `PROCESSING_ERROR`: General processing error
- `PARSE_ERROR`: Failed to parse image data
- `RESIZE_ERROR`: Image resizing failed
- `METADATA_ERROR`: Metadata extraction failed

### Error Response Format

```json
{
    "success": false,
    "error": "Image file too large",
    "code": "VALIDATION_FAILED",
    "details": {
        "maxSize": 10485760,
        "actualSize": 15728640
    }
}
```

### Common Error Scenarios

1. **File too large**
   ```json
   {
       "error": "Image file too large",
       "code": "VALIDATION_FAILED",
       "details": {
           "maxSize": 10485760,
           "actualSize": 15728640
       }
   }
   ```

2. **Unsupported format**
   ```json
   {
       "error": "Unsupported image format",
       "code": "VALIDATION_FAILED",
       "details": {
           "supportedFormats": ["jpeg", "jpg", "png", "webp", "gif"],
           "detectedFormat": "bmp"
       }
   }
   ```

3. **Invalid dimensions**
   ```json
   {
       "error": "Image dimensions too small",
       "code": "VALIDATION_FAILED",
       "details": {
           "minWidth": 32,
           "minHeight": 32,
           "actualWidth": 16,
           "actualHeight": 16
       }
   }
   ```

## Integration with Visual Recommendations

The Image Processing Service is designed to integrate seamlessly with the visual recommendation system:

### Preprocessing for AI Models

```javascript
// Prepare image for AI processing
const processed = await imageProcessingService.processImage(uploadedImage, {
    resize: true,
    targetWidth: 224,  // Standard input size for vision models
    targetHeight: 224,
    optimize: true
});

// Extract features using AI service
const features = await aiService.extractFeatures(processed.data);
```

### Memory Management

The service ensures efficient memory usage:

- Images are processed in memory streams
- No temporary files are created
- Automatic garbage collection of processed data
- Configurable processing limits

## Performance Considerations

### Optimization Tips

1. **Image Size**: Resize images to optimal dimensions before processing
2. **Format Selection**: Use JPEG for photos, PNG for graphics with transparency
3. **Quality Settings**: Balance quality vs. file size based on use case
4. **Concurrent Processing**: Service handles multiple concurrent requests efficiently

### Monitoring

The service provides processing time metrics for performance monitoring:

```javascript
const result = await imageProcessingService.processImage(imageData);
console.log('Processing time:', result.processingTime, 'ms');
```

## Testing

### Unit Tests

Run the comprehensive test suite:

```bash
npm test -- --testPathPattern=imageProcessingService.test.js
```

### Integration Tests

Test the REST API endpoints:

```bash
npm test -- --testPathPattern=imageProcessing.test.js
```

### Test Coverage

The service includes tests for:

- Image format validation
- Dimension extraction
- Base64 conversion
- Error handling
- Configuration management
- Concurrent request handling

## Future Enhancements

### Planned Features

1. **Advanced Resizing**: Integration with Sharp or Canvas for production-quality resizing
2. **Image Optimization**: Advanced compression algorithms
3. **Format Conversion**: Automatic format optimization based on content
4. **Batch Processing**: Support for processing multiple images simultaneously
5. **Caching**: Intelligent caching of processed images
6. **Streaming**: Support for streaming large images

### Production Considerations

For production deployment, consider:

1. **Image Processing Library**: Integrate Sharp for high-performance image processing
2. **Memory Limits**: Configure appropriate memory limits for large images
3. **Rate Limiting**: Implement rate limiting for image processing endpoints
4. **CDN Integration**: Use CDN for serving processed images
5. **Monitoring**: Add comprehensive logging and monitoring

## Dependencies

### Current Dependencies

- Node.js Buffer API (built-in)
- Express.js (for REST API)

### Recommended Production Dependencies

- `sharp`: High-performance image processing
- `multer`: File upload handling
- `redis`: Caching processed images
- `prometheus`: Metrics collection

## License

This service is part of the AI Virtual Try-On application and follows the same licensing terms.