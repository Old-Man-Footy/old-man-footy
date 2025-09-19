# Multi-stage build for optimized production image
FROM node:22-alpine AS browser-deps

WORKDIR /app

# Install minimal browser dependencies needed for Playwright
RUN sed -i 's|https://dl-cdn.alpinelinux.org|https://dl-2.alpinelinux.org|g' /etc/apk/repositories \
    && apk update \
    && apk add --no-cache \
    chromium \
    nss \
    freetype \
    ca-certificates

# Configure Playwright to use system Chromium
ENV PLAYWRIGHT_BROWSERS_PATH=0
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium

# Production dependencies stage
FROM browser-deps AS deps
ENV NODE_ENV=production

COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Common runtime stage for test and production
FROM node:22-alpine AS runtime
# Improve reliability of Alpine package fetches by switching mirror if dl-cdn is problematic
RUN sed -i 's|https://dl-cdn.alpinelinux.org|https://dl-2.alpinelinux.org|g' /etc/apk/repositories \
        && apk update \
        && apk add --no-cache \
            chromium \
            nss \
            freetype \
            ca-certificates

# Configure Playwright environment
ENV PLAYWRIGHT_BROWSERS_PATH=0
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001 -G nodejs

WORKDIR /app

# Copy dependencies and application files
COPY --from=deps --chown=appuser:nodejs /app/node_modules ./node_modules
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
COPY --chown=appuser:nodejs scripts/ ./scripts/
COPY --chown=appuser:nodejs docs/help/ ./docs/help/

# Prune any development dependencies
RUN npm prune --production

# Create necessary directories with correct permissions
RUN mkdir -p data public/uploads && \
    chown -R appuser:nodejs data public/uploads && \
    chmod 755 data

USER appuser

# UAT stage - inherits from the common runtime
FROM runtime AS test
ENV NODE_ENV=test

# Test port (different from production)
EXPOSE 3055

# Health check using ES modules syntax
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "import('http').then(http => http.default.get('http://localhost:3055/health', res => process.exit(res.statusCode === 200 ? 0 : 1))).on('error', () => process.exit(1));"

# Start application
CMD ["node", "app.mjs"]

# Production stage - inherits from the common runtime
FROM runtime AS production
ENV NODE_ENV=production

# Production port
EXPOSE 3060

# Health check using ES modules syntax
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=5 \
  CMD node -e "import('http').then(http => http.default.get('http://localhost:3060/health', res => process.exit(res.statusCode === 200 ? 0 : 1))).on('error', () => process.exit(1));"

# Start application
CMD ["node", "app.mjs"]