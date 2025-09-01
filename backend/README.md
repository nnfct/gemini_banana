# AI Virtual Try-On Backend

Backend API server for the AI Virtual Try-On application, providing virtual try-on image generation and product recommendation services.

## Features

- **Virtual Try-On Generation**: Generate virtual try-on images using Google Gemini AI
- **Product Recommendations**: AI-powered product recommendations using Azure OpenAI
- **RESTful API**: Clean, well-documented REST API endpoints
- **Error Handling**: Comprehensive error handling and validation
- **Health Monitoring**: Health check endpoints for monitoring

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **AI Services**: Google Gemini AI, Azure OpenAI
- **Testing**: Jest, Supertest
- **Development**: Nodemon, ESLint

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- Google Gemini API key
- Azure OpenAI credentials (optional)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables**
   Edit `.env` file with your API keys:
   ```env
   # Server Configuration
   NODE_ENV=development
   PORT=3000

   # AI Service Configuration
   GEMINI_API_KEY=your_gemini_api_key_here
   
   # Azure OpenAI (Optional)
   AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
   AZURE_OPENAI_KEY=your_azure_openai_key
   AZURE_OPENAI_DEPLOYMENT_ID=your_deployment_id
   ```

## Development

### Start Development Server
```bash
npm run dev
```

The server will start on `http://localhost:3000` with hot reload enabled.

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run dev:debug` - Start development server with debugging enabled
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run health` - Check server health

## API Documentation

### Base URL
- Development: `http://localhost:3000`
- Production: Your deployed URL

### Authentication
Currently, no authentication is required. API keys are configured server-side.

### Endpoints

#### Health Check
```http
GET /health
```

Returns server health status.

#### Virtual Try-On Generation
```http
POST /api/generate
Content-Type: application/json

{
  "person": {
    "base64": "base64_encoded_image_data",
    "mimeType": "image/jpeg"
  },
  "clothingItems": {
    "top": {
      "base64": "base64_encoded_image_data",
      "mimeType": "image/jpeg"
    },
    "pants": {
      "base64": "base64_encoded_image_data",
      "mimeType": "image/png"
    }
  }
}
```

**Response:**
```json
{
  "generatedImage": "data:image/jpeg;base64,generated_image_data",
  "requestId": "req_123456",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Get Recommendations
```http
POST /api/recommend
Content-Type: application/json

{
  "person": {
    "base64": "base64_encoded_image_data",
    "mimeType": "image/jpeg"
  },
  "clothingItems": {
    "top": {
      "base64": "base64_encoded_image_data",
      "mimeType": "image/jpeg"
    }
  },
  "options": {
    "maxPerCategory": 3,
    "minPrice": 20000,
    "maxPrice": 100000
  }
}
```

#### Get Recommendations from Virtual Try-On
```http
POST /api/recommend/from-fitting
Content-Type: application/json

{
  "generatedImage": "data:image/jpeg;base64,generated_image_data",
  "originalClothingItems": {
    "top": {
      "base64": "base64_encoded_image_data",
      "mimeType": "image/jpeg"
    }
  }
}
```

#### Service Status
```http
GET /api/generate/status
GET /api/recommend/status
```

Returns the status of AI services.

### Error Responses

All errors follow this format:
```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "field": "fieldName" // optional
  }
}
```

Common error codes:
- `BAD_REQUEST` (400) - Invalid request data
- `UNAUTHORIZED` (401) - Authentication required
- `NOT_FOUND` (404) - Resource not found
- `TOO_MANY_REQUESTS` (429) - Rate limit exceeded
- `INTERNAL_SERVER_ERROR` (500) - Server error
- `SERVICE_UNAVAILABLE` (503) - AI service unavailable
- `GATEWAY_TIMEOUT` (504) - Request timeout

## Testing

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Structure
```
tests/
├── setup.js              # Test configuration
├── utils/
│   ├── mocks.js          # Mock utilities
│   └── testHelpers.js    # Test helpers
├── routes/               # API route tests
├── services/             # Service layer tests
└── middleware/           # Middleware tests
```

### Writing Tests
```javascript
import { apiRequest, validateApiResponse } from '../utils/testHelpers.js';

describe('API Endpoint', () => {
  it('should handle valid request', async () => {
    const response = await apiRequest
      .post('/api/endpoint')
      .send({ data: 'test' });
    
    const body = validateApiResponse(response, 200);
    expect(body).toHaveProperty('result');
  });
});
```

## Project Structure

```
backend/
├── src/
│   ├── app.js                 # Express app configuration
│   ├── server.js              # Server entry point
│   ├── routes/
│   │   ├── index.js           # Route registry
│   │   ├── generate.js        # Virtual try-on routes
│   │   └── recommend.js       # Recommendation routes
│   ├── services/
│   │   ├── gemini.service.js  # Gemini AI service
│   │   ├── openai.service.js  # Azure OpenAI service
│   │   └── catalog.service.js # Product catalog service
│   ├── middleware/
│   │   ├── cors.js            # CORS configuration
│   │   ├── validation.js      # Request validation
│   │   └── error.js           # Error handling
│   ├── utils/
│   │   ├── config.js          # Environment configuration
│   │   └── logger.js          # Logging utility
│   └── types/
│       └── api.types.js       # API type definitions
├── tests/                     # Test files
├── data/
│   └── catalog.json          # Product catalog
├── package.json
└── README.md
```

## Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment (development/production) | No | development |
| `PORT` | Server port | No | 3000 |
| `GEMINI_API_KEY` | Google Gemini API key | Yes | - |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint URL | No | - |
| `AZURE_OPENAI_KEY` | Azure OpenAI API key | No | - |
| `AZURE_OPENAI_DEPLOYMENT_ID` | Azure OpenAI deployment ID | No | gpt-4-vision-preview |

### Service Configuration

The application automatically detects available AI services based on configured API keys:

- **Gemini AI**: Required for virtual try-on generation
- **Azure OpenAI**: Optional for enhanced recommendations

## Deployment

### Production Build
```bash
npm run build:prod
```

### Docker Deployment
```bash
# Build image
docker build -t ai-virtual-try-on-backend .

# Run container
docker run -p 3000:3000 --env-file .env ai-virtual-try-on-backend
```

### Environment-specific Deployment

#### Development
```bash
npm run dev
```

#### Staging
```bash
NODE_ENV=staging npm start
```

#### Production
```bash
NODE_ENV=production npm start
```

## Monitoring

### Health Checks
- `GET /health` - Basic health check
- `GET /api/generate/status` - Gemini service status
- `GET /api/recommend/status` - Recommendation service status

### Logging
The application uses structured logging with different levels:
- `error` - Error conditions
- `warn` - Warning conditions
- `info` - Informational messages
- `debug` - Debug messages (development only)

## Troubleshooting

### Common Issues

1. **"Gemini API key not configured"**
   - Ensure `GEMINI_API_KEY` is set in your `.env` file
   - Verify the API key is valid and has proper permissions

2. **"Service unavailable" errors**
   - Check your internet connection
   - Verify API keys are correct
   - Check service status endpoints

3. **"Request timeout" errors**
   - AI services may be slow during peak times
   - Consider increasing timeout values
   - Check network connectivity

4. **Image processing errors**
   - Ensure images are in supported formats (JPEG, PNG, WebP)
   - Check image size limits (10MB max)
   - Verify base64 encoding is correct

### Debug Mode
```bash
npm run dev:debug
```

Then attach a debugger to `localhost:9229`.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run tests and linting
6. Submit a pull request

## License

This project is licensed under the ISC License.