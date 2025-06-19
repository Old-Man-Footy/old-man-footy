# Deployment Troubleshooting Guide

This guide addresses the common deployment issues you're experiencing with the Old Man Footy application in containerized environments.

## Issues Identified

1. **File Permission Errors** - Upload directories can't be created
2. **SQLite Database Access** - Database file can't be opened  
3. **npm Cache Issues** - npm can't create cache directories
4. **Port Mismatches** - Container exposes different ports than configured

## Quick Fix Steps

### 1. Set Up Host Directories (Required First)

Before deploying, run the setup script to create directories with proper permissions:

```bash
# Make script executable
chmod +x scripts/setup-production-directories.sh

# Run setup script
./scripts/setup-production-directories.sh
```

### 2. Rebuild Docker Image

The updated Dockerfile fixes several issues:
- Creates npm cache directory for the container user
- Sets proper UID/GID consistency  
- Fixes port exposure (3060 instead of 3000)
- Improves database directory permissions

```bash
# Rebuild the image
docker build -t old-man-footy:latest .

# Or if using registry
docker build -t ghcr.io/devonuto/old-man-footy:latest .
docker push ghcr.io/devonuto/old-man-footy:latest
```

### 3. Deploy with Fixed Configuration

```bash
# Stop existing container
docker-compose -f docker-compose.prod.yml down

# Start with updated image
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

## What Was Fixed

### Dockerfile Improvements
- **npm Cache Directory**: Created `/home/appuser/.npm` with proper ownership
- **Database Permissions**: Added explicit database directory setup with correct permissions
- **Port Consistency**: Changed EXPOSE to 3060 to match production config
- **User Management**: Improved UID/GID consistency (1001:1001)

### Database Configuration Improvements  
- **Production Migration Strategy**: Uses Sequelize sync instead of CLI in production
- **Permission Checking**: Validates directory writability before proceeding
- **Better Error Messages**: More detailed logging for troubleshooting
- **Retry Logic**: Added connection retry for container startup timing

### Permission Management
- **Host Directory Setup**: Script creates all required directories with correct ownership
- **Container Consistency**: UID/GID 1001 matches between host and container
- **Volume Mount Safety**: Ensures volumes are writable before container starts

## Verification Steps

After deployment, verify the fixes:

```bash
# 1. Check container is running
docker-compose -f docker-compose.prod.yml ps

# 2. Check application logs
docker-compose -f docker-compose.prod.yml logs app

# 3. Test database connection
docker-compose -f docker-compose.prod.yml exec app node -e "require('./config/database').testConnection()"

# 4. Check file permissions in container
docker-compose -f docker-compose.prod.yml exec app ls -la data/
docker-compose -f docker-compose.prod.yml exec app ls -la public/uploads/

# 5. Test application health endpoint
curl http://localhost:3060/health
```

## Environment-Specific Notes

### Production Environment
- Uses Sequelize sync instead of CLI migrations (avoids npm permission issues)
- Database file: `/app/data/rugby-league-masters.db`
- All upload directories pre-created with proper permissions

### Development Environment  
- Still uses CLI migrations (works fine in development)
- Database file: `/app/data/dev-old-man-footy.db`
- Directories created on-demand

## Troubleshooting

### If Database Issues Persist
```bash
# Check database file permissions
docker-compose -f docker-compose.prod.yml exec app ls -la data/

# Manually test database creation
docker-compose -f docker-compose.prod.yml exec app touch data/test.db
docker-compose -f docker-compose.prod.yml exec app rm data/test.db
```

### If Upload Directory Issues Persist
```bash
# Check upload directory permissions  
docker-compose -f docker-compose.prod.yml exec app ls -la public/uploads/

# Test file creation in uploads
docker-compose -f docker-compose.prod.yml exec app touch public/uploads/test.txt
docker-compose -f docker-compose.prod.yml exec app rm public/uploads/test.txt
```

### If npm Issues Persist
```bash
# Check npm cache directory
docker-compose -f docker-compose.prod.yml exec app ls -la /home/appuser/.npm/

# Test npm access
docker-compose -f docker-compose.prod.yml exec app npm config get cache
```

## Security Notes

- Container runs as non-root user (appuser:1001)
- Directories have minimal required permissions (755)
- No unnecessary capabilities or privileges
- Volume mounts are read/write only where needed

## Next Steps

1. Run the setup script to prepare host directories
2. Rebuild and redeploy the container with the fixes
3. Monitor logs to verify all issues are resolved
4. Test application functionality (uploads, database operations)