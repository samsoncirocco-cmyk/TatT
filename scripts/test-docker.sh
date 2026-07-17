#!/bin/bash

echo "🐳 Docker Setup Verification Script"
echo "===================================="
echo ""

# Check 1: Docker installed
echo "✓ Checking Docker installation..."
if command -v docker &> /dev/null; then
    echo "  ✅ Docker is installed: $(docker --version)"
else
    echo "  ❌ Docker is NOT installed"
    echo "  Install from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check 2: Docker Compose installed
echo ""
echo "✓ Checking Docker Compose..."
if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
    echo "  ✅ Docker Compose is available"
else
    echo "  ❌ Docker Compose is NOT installed"
    exit 1
fi

# Check 3: Docker running
echo ""
echo "✓ Checking if Docker is running..."
if docker info &> /dev/null; then
    echo "  ✅ Docker daemon is running"
else
    echo "  ❌ Docker daemon is NOT running"
    echo "  Start Docker Desktop and try again"
    exit 1
fi

# Check 4: Files exist
echo ""
echo "✓ Checking Docker configuration files..."
files=("Dockerfile" "docker-compose.yml" ".dockerignore")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file exists"
    else
        echo "  ❌ $file is missing"
    fi
done

# Check 5: Source code exists
echo ""
echo "✓ Checking source code..."
dirs=("src" "public")
for dir in "${dirs[@]}"; do
    if [ -d "$dir" ]; then
        echo "  ✅ $dir/ directory exists"
    else
        echo "  ❌ $dir/ directory is missing"
    fi
done

# Check 6: Essential files
echo ""
echo "✓ Checking essential files..."
files=("package.json" "next.config.ts" "tailwind.config.ts")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file exists"
    else
        echo "  ❌ $file is missing"
    fi
done

echo ""
echo "===================================="
echo "✅ All checks passed!"
echo ""
echo "Next steps:"
echo "1. Run: docker-compose up dev"
echo "2. Wait for 'Ready in X seconds'"
echo "3. Open: http://localhost:3000"
echo ""
