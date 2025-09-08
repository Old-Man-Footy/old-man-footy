# Production Docker Configuration with Scheduled Maintenance

## Implementation Summary

### 🎯 Objective
Add cron task setup to the production Docker compose to enable scheduled database maintenance.

### ✅ Changes Made

1. **Enhanced docker-compose.prod.yml:**
   - Added new `maintenance` service running alongside the main `app` service
   - Configured to run `scripts/scheduled-maintenance.mjs` 
   - Shared database volume with main application
   - Separate backup volume for database backups
   - Resource limits (256M memory limit, 128M reservation)
   - Health checks to monitor maintenance service status
   - Proper logging and security configuration

2. **Updated scripts/scheduled-maintenance.mjs:**
   - Added graceful shutdown handlers for Docker (SIGTERM/SIGINT)
   - Enhanced logging for container environment
   - Proper process lifecycle management

3. **Updated README.md:**
   - Added comprehensive documentation about production services
   - Documented environment variables for maintenance configuration
   - Explained the two-service architecture (app + maintenance)

### 🏗️ Architecture

**Production Services:**
- **app**: Main web application (port 3050)
- **maintenance**: Scheduled maintenance tasks (daily at 2:00 AM)

**Shared Resources:**
- Database volume: `/volume2/docker/old-man-footy-prod/data`
- Backup volume: `/volume2/docker/old-man-footy-prod/backups`
- Network: `old-man-footy-network-prod`

### 📋 Key Features

1. **Automated Maintenance:**
   - Database optimization and cleanup
   - Regular database backups with retention policy
   - Performance analysis and monitoring

2. **Production-Ready Configuration:**
   - Proper resource allocation for maintenance tasks
   - Security hardening (no-new-privileges)
   - Comprehensive logging with rotation
   - Health monitoring for both services

3. **Environment Variables:**
   - Timezone configuration (Australia/Sydney)
   - Backup retention settings (30 days default)
   - Database connection pool tuning
   - Email notification settings for maintenance alerts

### 🚀 Deployment

To deploy the enhanced production setup:

```bash
# Start both web app and maintenance services
docker-compose -f docker-compose.prod.yml up -d

# Check service status
docker-compose -f docker-compose.prod.yml ps

# View maintenance logs
docker-compose -f docker-compose.prod.yml logs maintenance
```

### 📁 Volume Structure

```
/volume2/docker/old-man-footy-prod/
├── data/                 # Shared database files
│   ├── dev-old-man-footy.db
│   └── migrations/
├── backups/             # Maintenance service backups
│   ├── backup-YYYY-MM-DD.db
│   └── performance-logs/
└── uploads/             # User-uploaded files
    ├── logos/
    └── images/
```

### 🔍 Monitoring

The maintenance service includes:
- Health checks every 60 seconds
- Process monitoring via `pgrep`
- Automated restart on failure
- Comprehensive logging with size limits

This implementation provides a robust, production-ready scheduled maintenance system that runs alongside the main application without interference.
