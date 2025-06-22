# Multi-stage build for optimized production image
FROM node:22-alpine AS base

# OPTIMIZATION: Only install essential system dependencies in base
# REMOVED: chromium, nss, freetype, freetype-dev, harfbuzz, ttf-freefont, bash from base
# REASON: These are only needed in stages that actually use browsers, not in every stage
RUN apk add --no-cache dumb-init

WORKDIR /app

# Test stage - for user testing and CI/CD pipelines
FROM browser-deps AS test
ENV NODE_ENV=test

# TEST STAGE: Browser dependencies are inherited from browser-deps stage

# Configure Playwright for test environment
ENV PLAYWRIGHT_BROWSERS_PATH=0
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001 -G nodejs

COPY package*.json ./
# IMPORTANT: Install ALL dependencies for testing (dev + production)
RUN npm ci --include=dev

# Install Playwright browsers for testing
RUN npx playwright install --with-deps || echo "Playwright install failed, continuing..."

COPY . .
RUN chown -R appuser:nodejs /app
USER appuser
# FIXED: Port matches docker-compose.test.yml expectation
EXPOSE 3055
# FIXED: For user testing, start the server, not run tests
# Tests can be run with: docker run --rm old-man-footy:test npm test
CMD ["dumb-init", "npm", "start"]

# Production dependencies stage - minimal dependencies only
FROM base AS deps
ENV NODE_ENV=production

# OPTIMIZATION: Install only minimal browser deps needed for Playwright in production
# REMOVED: freetype-dev, harfbuzz, ttf-freefont, bash from production
# REASON: freetype-dev is dev headers, harfbuzz/ttf-freefont are for font rendering (not needed for headless scraping), bash not needed
# KEPT: chromium, nss, freetype, ca-certificates (minimal set for Playwright to work)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    ca-certificates

COPY package*.json ./

# Install production dependencies
# OPTIMIZATION: Keep Playwright in production (needed for MySideline scraping)
# but configure to use system browser instead of downloading full browser packages
RUN npm ci --only=production && \
    npm cache clean --force

# Configure Playwright to use system Chromium (saves ~300MB by not downloading browsers)
ENV PLAYWRIGHT_BROWSERS_PATH=0
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Production stage - optimized final image
FROM node:22-alpine AS production
ENV NODE_ENV=production

# OPTIMIZATION: Install only minimal runtime dependencies
# REMOVED: freetype-dev, harfbuzz, ttf-freefont, bash
# REASON: Same as deps stage - these are not needed for headless browser automation
RUN apk add --no-cache \
    dumb-init \
    chromium \
    nss \
    freetype \
    ca-certificates

# Configure Playwright environment (no browser downloads)
ENV PLAYWRIGHT_BROWSERS_PATH=0
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

# CONSISTENCY: Use same user name as other stages
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001 -G nodejs

WORKDIR /app

# Copy production dependencies from deps stage
COPY --from=deps --chown=appuser:nodejs /app/node_modules ./node_modules

# CRITICAL: Copy all necessary configuration and runtime files
COPY --chown=appuser:nodejs package*.json ./
COPY --chown=appuser:nodejs .sequelizerc ./ 

# CRITICAL: Copy application core files
COPY --chown=appuser:nodejs app.mjs ./

# CRITICAL: Copy all essential directories for runtime
COPY --chown=appuser:nodejs config/ ./config/
COPY --chown=appuser:nodejs controllers/ ./controllers/
COPY --chown=appuser:nodejs middleware/ ./middleware/
COPY --chown=appuser:nodejs models/ ./models/
COPY --chown=appuser:nodejs routes/ ./routes/
COPY --chown=appuser:nodejs services/ ./services/
COPY --chown=appuser:nodejs views/ ./views/
COPY --chown=appuser:nodejs public/ ./public/

# CRITICAL: Copy migrations for database initialization fallback
# Even though production uses sequelize.sync(), migrations provide backup initialization method
COPY --chown=appuser:nodejs migrations/ ./migrations/

# RESTORED: Important production cleanup command
# REASON: Removes any dev dependencies that might have been inadvertently included
# This is crucial for minimizing production image size
RUN npm prune --production

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
    chown -R appuser:nodejs data public/uploads && \
    chmod 755 data && \
    touch data/.gitkeep && \
    chown appuser:nodejs data/.gitkeep

USER appuser

# Expose port
EXPOSE 3060

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3060/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start application
CMD ["dumb-init", "node", "app.js"]