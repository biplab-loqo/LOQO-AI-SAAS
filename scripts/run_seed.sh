#!/bin/bash

echo "Starting LOQO Data Seeding Script..."
echo "======================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed"
    exit 1
fi

# Check if pymongo is installed
python3 -c "import pymongo" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "Installing pymongo..."
    pip3 install pymongo
fi

# Run the script
cd "$(dirname "$0")/.."
python3 scripts/seed_project_data.py

echo ""
echo "Script execution completed!"
