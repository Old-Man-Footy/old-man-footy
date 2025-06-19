#!/bin/bash

# setup-dsm-directories.sh
# Script to create the required directory structure on Synology DSM for Old Man Footy

echo "🏉 Setting up Old Man Footy directories on DSM..."

# Base directories
BASE_DIR="/volume2/docker/old-man-footy-prod"
DATA_DIR="$BASE_DIR/data"
UPLOADS_DIR="$BASE_DIR/uploads"

# Create base directories
echo "📁 Creating base directories..."
mkdir -p "$DATA_DIR"
mkdir -p "$UPLOADS_DIR"

# Create upload subdirectories
echo "📁 Creating upload subdirectories..."
mkdir -p "$UPLOADS_DIR/logos/club"
mkdir -p "$UPLOADS_DIR/logos/carnival"
mkdir -p "$UPLOADS_DIR/logos/sponsor"
mkdir -p "$UPLOADS_DIR/logos/system"
mkdir -p "$UPLOADS_DIR/images/club/promo"
mkdir -p "$UPLOADS_DIR/images/club/gallery"
mkdir -p "$UPLOADS_DIR/images/carnival/promo"
mkdir -p "$UPLOADS_DIR/images/carnival/gallery"
mkdir -p "$UPLOADS_DIR/images/sponsor/promo"
mkdir -p "$UPLOADS_DIR/images/sponsor/gallery"
mkdir -p "$UPLOADS_DIR/documents/club"
mkdir -p "$UPLOADS_DIR/documents/carnival"
mkdir -p "$UPLOADS_DIR/documents/sponsor"
mkdir -p "$UPLOADS_DIR/temp"

# Set permissions (1001:1001 matches the container user)
echo "🔐 Setting permissions..."
chown -R 1001:1001 "$BASE_DIR"
chmod -R 755 "$BASE_DIR"

echo "✅ Directory setup complete!"
echo ""
echo "Created directories:"
echo "  📂 $DATA_DIR"
echo "  📂 $UPLOADS_DIR"
echo "     └── logos/ (club, carnival, sponsor, system)"
echo "     └── images/ (club, carnival, sponsor subdirs with promo/gallery)"
echo "     └── documents/ (club, carnival, sponsor)"
echo "     └── temp/"
echo ""
echo "Permissions set to 1001:1001 to match Docker container user."
echo ""
echo "You can now run: docker-compose -f docker-compose.prod.yml up -d"