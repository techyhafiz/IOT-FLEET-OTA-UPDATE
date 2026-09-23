#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -e

echo "=========================================="
echo "  IoT Fleet OTA Platform — Render Build   "
echo "=========================================="

echo "[1/4] Installing Python dependencies..."
pip install --upgrade pip
pip install -r backend/requirements.txt

echo "[2/4] Installing Shared dependencies..."
cd shared
npm install
cd ..

echo "[3/4] Building PC-A Fleet Dashboard..."
cd dashboard
npm install
npm run build
cd ..

echo "[4/4] Building PC-B ESP32 Simulator..."
cd simulator
npm install
npm run build
cd ..

echo "=========================================="
echo "  Build Completed Successfully!           "
echo "=========================================="
