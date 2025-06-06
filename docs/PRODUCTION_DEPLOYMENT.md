# Production Deployment Guide - Rugby League Masters

## Pre-Deployment Checklist

### ✅ Environment Setup
- [ ] Production MongoDB Atlas cluster configured
- [ ] Environment variables configured (use .env.production.template)
- [ ] SSL certificates obtained and configured
- [ ] Domain name configured with DNS
- [ ] Email service (SendGrid/AWS SES) configured
- [ ] CDN configured (optional but recommended)

### ✅ Security Configuration
- [ ] Security checklist completed (see docs/SECURITY_CHECKLIST.md)
- [ ] Rate limiting configured
- [ ] CORS settings updated for production domain
- [ ] File upload restrictions verified
- [ ] Security headers configured

### ✅ Performance Optimization
- [ ] Database indexes created (using config/database-optimizer.js)
- [ ] Connection pooling configured
- [ ] Static file caching enabled
- [ ] Compression middleware enabled
- [ ] Image optimization implemented

## Deployment Options

### Option 1: Traditional VPS/Server Deployment

#### Server Requirements
- **OS**: Ubuntu 20.04 LTS or newer
- **CPU**: 2+ cores
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 50GB SSD minimum
- **Node.js**: v18.x or newer
- **MongoDB**: Use MongoDB Atlas (recommended) or self-hosted

#### Deployment Steps

1. **Prepare the Server**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx for reverse proxy
sudo apt install nginx

# Install certbot for SSL
sudo apt install snapd
sudo snap install --classic certbot
```

2. **Deploy Application**
```bash
# Clone repository
git clone https://github.com/your-repo/rugby-league-masters.git
cd rugby-league-masters

# Install dependencies
npm ci --only=production

# Copy and configure environment
cp .env.production.template .env.production
# Edit .env.production with your values

# Build static assets (if any)
npm run build

# Create PM2 ecosystem file
```

3. **PM2 Configuration (ecosystem.config.js)**
```javascript
module.exports = {
  apps: [{
    name: 'rugby-masters',
    script: 'app.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

4. **Nginx Configuration**
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # Static files
    location /css/ {
        alias /path/to/app/public/css/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /js/ {
        alias /path/to/app/public/js/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /images/ {
        alias /path/to/app/public/images/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /uploads/ {
        alias /path/to/app/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
}
```

5. **Start Application**
```bash
# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### Option 2: Docker Deployment

#### Dockerfile
```dockerfile
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodeuser -u 1001

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Change ownership to non-root user
RUN chown -R nodeuser:nodejs /usr/src/app
USER nodeuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node healthcheck.js

# Start application
CMD ["node", "app.js"]
```

#### Docker Compose (docker-compose.yml)
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    depends_on:
      - redis
    restart: unless-stopped
    volumes:
      - ./uploads:/usr/src/app/uploads
      - ./logs:/usr/src/app/logs

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  redis_data:
```

### Option 3: Cloud Platform Deployment

#### Azure App Service
```bash
# Install Azure CLI
npm install -g @azure/static-web-apps-cli

# Deploy to Azure
az webapp up --name rugby-masters --resource-group rg-rugby-masters --plan asp-rugby-masters
```

#### AWS Elastic Beanstalk
```bash
# Install EB CLI
pip install awsebcli

# Initialize and deploy
eb init rugby-masters
eb create production
eb deploy
```

#### Google Cloud Platform
```bash
# Install gcloud CLI
# Create app.yaml
echo "runtime: nodejs18" > app.yaml

# Deploy
gcloud app deploy
```

## Post-Deployment Configuration

### 1. Database Setup
```bash
# Run database optimization
node -e "
const DatabaseOptimizer = require('./config/database-optimizer');
(async () => {
  await DatabaseOptimizer.createIndexes();
  await DatabaseOptimizer.setupMonitoring();
  console.log('Database optimization complete');
})();
"
```

### 2. SSL Certificate Setup
```bash
# For Let's Encrypt with Certbot
sudo certbot --nginx -d your-domain.com

# Set up auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 3. Monitoring Setup
```bash
# Setup log rotation
sudo nano /etc/logrotate.d/rugby-masters

# Add monitoring cron jobs
crontab -e
# Add database backup: 0 2 * * * cd /path/to/app && node -e "require('./config/database-optimizer').backupDatabase()"
# Add maintenance: 0 3 * * 0 cd /path/to/app && node -e "require('./config/database-optimizer').performMaintenance()"
```

## Testing Production Deployment

### Health Checks
```bash
# Test application health
curl https://your-domain.com/health

# Test database connectivity
curl https://your-domain.com/ready

# Test SSL configuration
curl -I https://your-domain.com

# Test email functionality
# Send test email through admin interface
```

### Performance Testing
```bash
# Install testing tools
npm install -g loadtest

# Run load test
loadtest -c 10 -t 60 https://your-domain.com/

# Monitor during test
pm2 monit
```

### Security Testing
```bash
# Run security audit
npm audit

# Test SSL configuration
curl -I https://your-domain.com

# Verify security headers
curl -I https://your-domain.com | grep -E "(X-Frame-Options|X-Content-Type|Strict-Transport)"
```

## Maintenance & Monitoring

### Daily Monitoring
- Check application logs: `pm2 logs`
- Monitor database performance
- Check SSL certificate status
- Review security logs

### Weekly Maintenance
- Update dependencies: `npm update`
- Run security audit: `npm audit`
- Check backup integrity
- Review performance metrics

### Monthly Tasks
- Update system packages
- Review and rotate logs
- Performance optimization review
- Security compliance check

## Troubleshooting

### Common Issues

1. **Application Won't Start**
```bash
# Check logs
pm2 logs rugby-masters

# Check environment variables
cat .env.production

# Verify Node.js version
node --version
```

2. **Database Connection Issues**
```bash
# Test MongoDB connection
mongo "your-connection-string"

# Check network connectivity
ping cluster.mongodb.net
```

3. **SSL Certificate Issues**
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate
sudo certbot renew --dry-run
```

4. **Performance Issues**
```bash
# Check system resources
htop
df -h

# Monitor database queries
# Use MongoDB Compass or Atlas monitoring

# Check application performance
pm2 monit
```

## Backup & Recovery

### Automated Backups
```bash
# Database backup (automated via cron)
0 2 * * * cd /path/to/app && node -e "require('./config/database-optimizer').backupDatabase()"

# File backup
0 3 * * * tar -czf /backups/files-$(date +\%Y\%m\%d).tar.gz /path/to/app/uploads
```

### Recovery Procedures
```bash
# Restore database from backup
mongorestore --uri="your-connection-string" /path/to/backup

# Restore files
tar -xzf /backups/files-20241206.tar.gz -C /path/to/app/
```

## Performance Optimization

### Caching Strategy
- Use Redis for session storage
- Implement page caching for static content
- Use CDN for assets
- Enable compression

### Database Optimization
- Regular index maintenance
- Query optimization
- Connection pooling
- Data archival

### Application Optimization
- Enable compression middleware
- Optimize images
- Minify CSS/JS
- Use PM2 cluster mode

## Security Hardening

### Server Security
- Regular security updates
- Firewall configuration
- SSH key authentication
- Fail2ban installation

### Application Security
- Regular dependency updates
- Security header configuration
- Rate limiting
- Input validation

This deployment guide provides comprehensive instructions for getting the Rugby League Masters application running in production with proper security, performance, and monitoring configurations.