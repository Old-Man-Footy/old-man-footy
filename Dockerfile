# Multi-stage build for optimized production image
FROM node:22-alpine AS base

# Install essential system dependencies
RUN apk add --no-cache dumb-init

WORKDIR /app

# Browser dependencies stage - for Playwright scraping functionality
FROM base AS browser-deps

# Install minimal browser dependencies needed for Playwright
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    ca-certificates

# Configure Playwright to use system Chromium
ENV PLAYWRIGHT_BROWSERS_PATH=0
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Production dependencies stage
FROM browser-deps AS deps
ENV NODE_ENV=production

COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# UAT stage - identical to production but different port
FROM node:22-alpine AS test
ENV NODE_ENV=test

# Install minimal runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    chromium \
    nss \
    freetype \
    ca-certificates

# Install Playwright browsers
RUN npx playwright install --with-deps

# # Configure Playwright environment
# ENV PLAYWRIGHT_BROWSERS_PATH=0
# ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
# ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001 -G nodejs

WORKDIR /app

# Copy production dependencies from deps stage
COPY --from=deps --chown=appuser:nodejs /app/node_modules ./node_modules

# Copy application files
COPY --chown=appuser:nodejs package*.json ./
COPY --chown=appuser:nodejs .sequelizerc ./
COPY --chown=appuser:nodejs app.mjs ./
COPY --chown=appuser:nodejs config/ ./config/
COPY --chown=appuser:nodejs controllers/ ./controllers/
COPY --chown=appuser:nodejs middleware/ ./middleware/
COPY --chown=appuser:nodejs models/ ./models/
COPY --chown=appuser:nodejs routes/ ./routes/
COPY --chown=appuser:nodejs services/ ./services/
COPY --chown=appuser:nodejs views/ ./views/
COPY --chown=appuser:nodejs public/ ./public/
COPY --chown=appuser:nodejs migrations/ ./migrations/

# Clean up any dev dependencies
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

# Test port (different from production)
EXPOSE 3055

# Health check using ES modules syntax
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "import('http').then(http => { http.default.get('http://localhost:3055/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1)); })"

# Start application
CMD ["dumb-init", "node", "app.mjs"]

# Production stage - identical to Test but different port
FROM node:22-alpine AS production
ENV NODE_ENV=production

# Install minimal runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    chromium \
    nss \
    freetype \
    ca-certificates

# Configure Playwright environment
ENV PLAYWRIGHT_BROWSERS_PATH=0
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001 -G nodejs

WORKDIR /app

# Copy production dependencies from deps stage
COPY --from=deps --chown=appuser:nodejs /app/node_modules ./node_modules

# Copy application files
COPY --chown=appuser:nodejs package*.json ./
COPY --chown=appuser:nodejs .sequelizerc ./
COPY --chown=appuser:nodejs app.mjs ./
COPY --chown=appuser:nodejs config/ ./config/
COPY --chown=appuser:nodejs controllers/ ./controllers/
COPY --chown=appuser:nodejs middleware/ ./middleware/
COPY --chown=appuser:nodejs models/ ./models/
COPY --chown=appuser:nodejs routes/ ./routes/
COPY --chown=appuser:nodejs services/ ./services/
COPY --chown=appuser:nodejs views/ ./views/
COPY --chown=appuser:nodejs public/ ./public/
COPY --chown=appuser:nodejs migrations/ ./migrations/

# Clean up any dev dependencies
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

# Production port
EXPOSE 3060

# Health check using ES modules syntax
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "import('http').then(http => { http.default.get('http://localhost:3060/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1)); })"

# Start application
CMD ["dumb-init", "node", "app.mjs"]