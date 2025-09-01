# Deployment Guide

This guide covers deployment options for the AI Virtual Try-On application.

## Quick Deployment

### Docker Compose (Recommended)

#### Production Deployment
```bash
# Build and start production containers
npm run docker:build
npm run docker:up

# View logs
npm run docker:logs

# Stop containers
npm run docker:down
```

#### Development Deployment
```bash
# Build and start development containers
npm run docker:dev:build
npm run docker:dev

# Stop development containers
npm run docker:dev:down
```

### Manual Deployment

#### Prerequisites
- Node.js 18+
- npm 9+
- Production environment variables configured

#### Build for Production
```bash
# Install dependencies
npm run install:all

# Build both services
npm run build:prod
```

#### Deploy Backend
```bash
cd backend
npm start
```

#### Deploy Frontend
Serve the `frontend/dist` folder using a web server like nginx, Apache, or a CDN.

## Environment Configuration

### Backend Environment Variables
Create `backend/.env` with:
```env
# Required
GEMINI_API_KEY=your_gemini_api_key
AZURE_OPENAI_ENDPOINT=your_azure_endpoint
AZURE_OPENAI_KEY=your_azure_key
AZURE_OPENAI_DEPLOYMENT_ID=your_deployment_id

# Optional
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
CORS_ORIGIN=http://localhost:8080
```

### Frontend Environment Variables
Create `frontend/.env.production` with:
```env
VITE_API_URL=http://localhost:3000
```

## Docker Deployment

### Production Docker Images

#### Backend Image
```dockerfile
# Build backend image
docker build -t ai-virtual-try-on-backend ./backend

# Run backend container
docker run -d \
  --name backend \
  -p 3000:3000 \
  --env-file ./backend/.env \
  ai-virtual-try-on-backend
```

#### Frontend Image
```dockerfile
# Build frontend image
docker build -t ai-virtual-try-on-frontend ./frontend

# Run frontend container
docker run -d \
  --name frontend \
  -p 8080:8080 \
  --link backend:backend \
  ai-virtual-try-on-frontend
```

### Docker Compose Services

The application includes two Docker Compose configurations:

#### Production (`docker-compose.yml`)
- **Backend**: Node.js application on port 3000
- **Frontend**: Nginx serving static files on port 8080
- **Features**: Health checks, restart policies, logging

#### Development (`docker-compose.dev.yml`)
- **Backend**: Development server with hot reload and debugging
- **Frontend**: Vite development server with HMR
- **Features**: Volume mounts for live code changes

## Cloud Deployment

### AWS Deployment

#### Using ECS (Elastic Container Service)
1. Push Docker images to ECR
2. Create ECS task definitions
3. Deploy services to ECS cluster
4. Configure Application Load Balancer

#### Using Elastic Beanstalk
1. Create application versions from Docker Compose
2. Deploy to Elastic Beanstalk environments
3. Configure environment variables

### Azure Deployment

#### Using Container Instances
1. Push images to Azure Container Registry
2. Create container groups
3. Configure networking and environment variables

#### Using App Service
1. Deploy using Docker Compose
2. Configure application settings
3. Set up custom domains and SSL

### Google Cloud Deployment

#### Using Cloud Run
1. Push images to Container Registry
2. Deploy services to Cloud Run
3. Configure traffic allocation and scaling

## Monitoring and Logging

### Health Checks
- **Backend**: `GET /health`
- **Frontend**: `GET /health`

### Logging
- **Backend**: Structured logging to console and files
- **Frontend**: Nginx access and error logs
- **Docker**: Container logs via `docker logs` or `docker-compose logs`

### Monitoring
- Use health check endpoints for uptime monitoring
- Monitor container resource usage
- Set up alerts for service failures

## Performance Optimization

### Backend Optimizations
- Enable gzip compression
- Use PM2 for process management in production
- Configure proper caching headers
- Optimize AI service calls

### Frontend Optimizations
- Static asset caching (1 year for immutable assets)
- Gzip compression enabled
- Code splitting and lazy loading
- CDN deployment for global distribution

## Security Considerations

### Backend Security
- Non-root user in Docker containers
- Environment variable management
- CORS configuration
- Rate limiting (implement as needed)

### Frontend Security
- Content Security Policy headers
- XSS protection headers
- Secure nginx configuration
- HTTPS enforcement (configure in reverse proxy)

## Scaling

### Horizontal Scaling
- Run multiple backend instances behind a load balancer
- Use session-less architecture for stateless scaling
- Consider Redis for shared caching if needed

### Vertical Scaling
- Monitor CPU and memory usage
- Adjust container resource limits
- Optimize AI service usage

## Troubleshooting

### Common Issues

#### Backend Won't Start
1. Check environment variables
2. Verify AI service credentials
3. Check port availability
4. Review application logs

#### Frontend Can't Connect to Backend
1. Verify backend is running and healthy
2. Check CORS configuration
3. Verify API URL configuration
4. Check network connectivity

#### Docker Issues
1. Check Docker daemon is running
2. Verify image builds successfully
3. Check container logs: `docker logs <container_name>`
4. Verify port mappings and networking

### Log Analysis
```bash
# View backend logs
docker logs ai-virtual-try-on-backend

# View frontend logs
docker logs ai-virtual-try-on-frontend

# View all logs
npm run docker:logs

# Follow logs in real-time
docker-compose logs -f
```

## Backup and Recovery

### Data Backup
- Backend: No persistent data (stateless)
- Frontend: Static assets (can be rebuilt)
- Configuration: Backup environment files

### Disaster Recovery
1. Rebuild from source code
2. Restore environment configurations
3. Redeploy using Docker Compose
4. Verify health checks pass

## Maintenance

### Updates
1. Update dependencies regularly
2. Rebuild Docker images
3. Test in staging environment
4. Deploy with zero-downtime strategy

### Monitoring
- Set up automated health checks
- Monitor resource usage
- Track error rates and response times
- Set up alerting for critical issues