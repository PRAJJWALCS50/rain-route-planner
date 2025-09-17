@echo off
echo 🧪 Testing build process...

echo 📦 Installing dependencies...
npm install
cd client
npm install

echo 🔨 Testing React build...
npx react-scripts build

if %errorlevel% equ 0 (
    echo ✅ Build successful!
    echo 📁 Build files created in client/build/
    dir client\build\
) else (
    echo ❌ Build failed!
    exit /b 1
)
