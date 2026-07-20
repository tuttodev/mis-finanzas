#!/bin/bash

# Script to configure automatic execution of transaction extractor
# Runs every 6 hours

set -e

echo "⏰ Configuring automatic execution..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Get absolute path of current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PYTHON_PATH="$SCRIPT_DIR/venv/bin/python3"
SCRIPT_PATH="$SCRIPT_DIR/transaction_extractor.py"

# Verify files exist
if [ ! -f "$SCRIPT_PATH" ]; then
    echo -e "${RED}❌ transaction_extractor.py not found${NC}"
    exit 1
fi

if [ ! -f "$PYTHON_PATH" ]; then
    echo -e "${RED}❌ Virtual environment not found. Run ./install_finance.sh first${NC}"
    exit 1
fi

echo "Choose execution frequency:"
echo "1. Every 6 hours (recommended)"
echo "2. Every 3 hours"
echo "3. Every 12 hours"
echo "4. Once daily (at 12:00 PM)"
echo ""
read -p "Option (1-4): " option

case $option in
    1)
        CRON_TIME="0 */6 * * *"
        DESCRIPTION="every 6 hours"
        ;;
    2)
        CRON_TIME="0 */3 * * *"
        DESCRIPTION="every 3 hours"
        ;;
    3)
        CRON_TIME="0 */12 * * *"
        DESCRIPTION="every 12 hours"
        ;;
    4)
        CRON_TIME="0 12 * * *"
        DESCRIPTION="daily at 12:00 PM"
        ;;
    *)
        echo -e "${RED}❌ Invalid option${NC}"
        exit 1
        ;;
esac

# Create cron line with full path
CRON_LINE="$CRON_TIME cd $SCRIPT_DIR && $PYTHON_PATH $SCRIPT_PATH >> $SCRIPT_DIR/transaction_extractor.log 2>&1"

# Check if cron entry already exists
if crontab -l 2>/dev/null | grep -q "transaction_extractor.py"; then
    echo -e "${YELLOW}⚠️  A cron entry for this script already exists${NC}"
    echo "Do you want to replace it? (y/n)"
    read -r response
    
    if [[ "$response" == "y" ]]; then
        # Remove old entry
        crontab -l 2>/dev/null | grep -v "transaction_extractor.py" | crontab -
        echo -e "${GREEN}✅ Old entry removed${NC}"
    else
        echo "Operation cancelled"
        exit 0
    fi
fi

# Add new cron entry
(crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -

echo ""
echo -e "${GREEN}✅ Configuration completed!${NC}"
echo ""
echo "The script will run automatically $DESCRIPTION"
echo ""
echo "To view scheduled jobs:"
echo "  crontab -l"
echo ""
echo "To disable automatic execution:"
echo "  crontab -e"
echo "  (and delete the line containing 'transaction_extractor.py')"
echo ""
echo "To view execution logs:"
echo "  tail -f $SCRIPT_DIR/transaction_extractor.log"
echo ""

# macOS cron permissions note
echo -e "${YELLOW}📝 IMPORTANT for macOS:${NC}"
echo "If this is your first time using cron, you need to grant permissions:"
echo "1. Open 'System Settings' → 'Privacy & Security'"
echo "2. Go to 'Full Disk Access'"
echo "3. Add 'cron' to the list"
echo ""
echo "This allows cron to execute the script automatically"
