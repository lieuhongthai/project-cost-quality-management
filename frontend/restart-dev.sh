#!/bin/bash

echo "🧹 Cleaning Vite cache..."
rm -rf node_modules/.vite
rm -rf dist

echo "🔄 Restarting dev server..."
npm run dev
