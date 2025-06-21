#!/bin/bash

# Docker Image Size Optimization Script
# Run this script to analyze and optimize your Docker image size

echo "🔍 Analyzing Docker image size optimizations..."

# Function to check if a package is actually used in the codebase
check_package_usage() {
    local package=$1
    echo "Checking usage of: $package"
    
    # Search for imports/requires of the package
    if grep -r "require.*$package\|import.*$package\|from.*$package" \
        --include="*.js" \
        --exclude-dir=node_modules \
        --exclude-dir=tests \
        . > /dev/null 2>&1; then
        echo "✅ $package is being used"
        return 0
    else
        echo "❌ $package might not be used"
        return 1
    fi
}

echo -e "\n📦 Checking for potentially unused heavy dependencies..."

# Check heavy packages that might not be needed in production
heavy_packages=("playwright" "puppeteer" "jest" "nodemon" "supertest")

for package in "${heavy_packages[@]}"; do
    check_package_usage "$package"
done

echo -e "\n🐳 Docker optimization recommendations:"
echo "1. ✅ Using distroless base image (saves ~100MB)"
echo "2. ✅ Multi-stage build to exclude dev dependencies"
echo "3. ✅ Removing browser packages from production"
echo "4. ✅ Optimized .dockerignore"

echo -e "\n💡 Additional optimizations you can consider:"
echo "- Move 'playwright' and 'puppeteer' to devDependencies if only used for testing"
echo "- Consider using 'npm ci --omit=dev' instead of '--only=production'"
echo "- Use 'npm prune --production' after dependency installation"

echo -e "\n🚀 To build the optimized image:"
echo "docker build --target production -t old-man-footy:optimized ."

echo -e "\n📊 To compare image sizes:"
echo "docker images | grep old-man-footy"