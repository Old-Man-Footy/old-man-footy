#!/bin/bash

# setup-production-directories.sh
# Script to set up proper directory permissions for Docker production deployment

echo "🚀 Setting up Old Man Footy production directories..."

# Define base directories
BASE_DIR="/volume2/docker/old-man-footy-prod"
DATA_DIR="$BASE_DIR/data"
UPLOADS_DIR="$BASE_DIR/uploads"

# Docker user UID/GID (matches Dockerfile)
DOCKER_UID=1001
DOCKER_GID=1001

echo "📁 Creating base directories..."
sudo mkdir -p "$DATA_DIR"
sudo mkdir -p "$UPLOADS_DIR"

echo "📁 Creating upload subdirectories..."
sudo mkdir -p "$UPLOADS_DIR/logos/club"
sudo mkdir -p "$UPLOADS_DIR/logos/carnival"
sudo mkdir -p "$UPLOADS_DIR/logos/sponsor"
sudo mkdir -p "$UPLOADS_DIR/logos/system"
sudo mkdir -p "$UPLOADS_DIR/images/club/promo"
sudo mkdir -p "$UPLOADS_DIR/images/club/gallery"
sudo mkdir -p "$UPLOADS_DIR/images/carnival/promo"
sudo mkdir -p "$UPLOADS_DIR/images/carnival/gallery"
sudo mkdir -p "$UPLOADS_DIR/images/sponsor/promo"
sudo mkdir -p "$UPLOADS_DIR/images/sponsor/gallery"
sudo mkdir -p "$UPLOADS_DIR/documents/club"
sudo mkdir -p "$UPLOADS_DIR/documents/carnival"
sudo mkdir -p "$UPLOADS_DIR/documents/sponsor"
sudo mkdir -p "$UPLOADS_DIR/temp"

echo "🔒 Setting directory ownership and permissions..."
# Set ownership to match Docker container user
sudo chown -R $DOCKER_UID:$DOCKER_GID "$BASE_DIR"

# Set proper permissions
sudo chmod -R 755 "$DATA_DIR"
sudo chmod -R 755 "$UPLOADS_DIR"

# Make sure database directory is writable
sudo chmod 755 "$DATA_DIR"

echo "✅ Directory setup complete!"
echo ""
echo "📋 Summary:"
echo "   Base directory: $BASE_DIR"
echo "   Data directory: $DATA_DIR (for SQLite database)"
echo "   Uploads directory: $UPLOADS_DIR (for file uploads)"
echo "   Owner: $DOCKER_UID:$DOCKER_GID (matches Docker container user)"
echo "   Permissions: 755 (read/write/execute for owner, read/execute for group/others)"
echo ""
echo "🐳 You can now run: docker-compose -f docker-compose.prod.yml up -d"