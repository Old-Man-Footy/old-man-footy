# Multi-stage build for optimized production image
FROM node:22-alpine AS base

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory with proper permissions
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Development stage
FROM base AS development
ENV NODE_ENV=development
RUN npm ci --include=dev
COPY . .
RUN chown -R nextjs:nodejs /app
USER nextjs
EXPOSE 3000
CMD ["dumb-init", "npm", "run", "dev"]

# Production dependencies stage
FROM base AS deps
ENV NODE_ENV=production
RUN npm ci --only=production && npm cache clean --force

# Production build stage
FROM base AS build
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --include=dev
COPY . .
# Run any build steps if needed (none for this app currently)
RUN npm prune --production

# Production stage
FROM node:22-alpine AS production
ENV NODE_ENV=production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user with specific UID/GID for consistency
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001 -G nodejs

WORKDIR /app

# Create npm cache directory for the user
RUN mkdir -p /home/appuser/.npm && \
    chown -R appuser:nodejs /home/appuser/.npm

# Copy production dependencies
COPY --from=deps --chown=appuser:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=appuser:nodejs . .

# Create necessary directories with proper permissions
RUN mkdir -p data \
    public/uploads/logos/club \
    public/uploads/logos/carnival \
    public/uploads/logos/sponsor \
    public/uploads/logos/system \
    public/uploads/images/club/promo \
    public/uploads/images/club/gallery \
    public/uploads/images/carnival/promo \
    public/uploads/images/carnival/gallery \
    public/uploads/images/sponsor/promo \
    public/uploads/images/sponsor/gallery \
    public/uploads/documents/club \
    public/uploads/documents/carnival \
    public/uploads/documents/sponsor \
    public/uploads/temp && \
    chown -R appuser:nodejs data public/uploads

# Ensure database directory is writable
RUN chmod 755 data && \
    touch data/.gitkeep && \
    chown appuser:nodejs data/.gitkeep

# Set npm cache directory
ENV npm_config_cache=/home/appuser/.npm

# Switch to non-root user
USER appuser

# Expose port (match production config)
EXPOSE 3060

# Health check (use correct port)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3060/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start application with proper signal handling
CMD ["dumb-init", "node", "app.js"]