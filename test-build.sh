#!/bin/bash

echo "🧪 Testing build process..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install
cd client && npm install

# Test build
echo "🔨 Testing React build..."
npx react-scripts build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "📁 Build files created in client/build/"
    ls -la client/build/
else
    echo "❌ Build failed!"
    exit 1
fi
