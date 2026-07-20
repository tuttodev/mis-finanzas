#!/bin/bash

# Personal Finance System Installation Script
# For macOS

set -e  # Exit on error

echo "🚀 Installing Personal Finance System..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Verify macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}❌ This script only works on macOS${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Operating system: macOS${NC}"

# 2. Verify Python 3
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed${NC}"
    echo "Install it from https://www.python.org/downloads/"
    exit 1
fi

echo -e "${GREEN}✅ Python 3 installed: $(python3 --version)${NC}"

# 3. Verify PostgreSQL
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL is not installed${NC}"
    echo "Do you want to install it with Homebrew? (y/n)"
    read -r response
    
    if [[ "$response" == "y" ]]; then
        if ! command -v brew &> /dev/null; then
            echo -e "${YELLOW}Installing Homebrew...${NC}"
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        fi
        
        echo -e "${YELLOW}Installing PostgreSQL...${NC}"
        brew install postgresql@14
        brew services start postgresql@14
        echo -e "${GREEN}✅ PostgreSQL installed and started${NC}"
    else
        echo -e "${RED}❌ PostgreSQL is required. Install it manually.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ PostgreSQL installed: $(psql --version)${NC}"
fi

# 4. Create Python virtual environment
echo ""
echo -e "${YELLOW}📦 Creating Python virtual environment...${NC}"
python3 -m venv venv
source venv/bin/activate

# 5. Install Python dependencies
echo -e "${YELLOW}📦 Installing Python dependencies...${NC}"
pip install --upgrade pip
pip install psycopg2-binary python-dotenv

echo -e "${GREEN}✅ Dependencies installed${NC}"

# 6. Configure database
echo ""
echo -e "${YELLOW}🗄️  Configuring PostgreSQL database...${NC}"
echo "Enter your PostgreSQL username (press Enter to use '$USER'):"
read -r db_user
db_user=${db_user:-$USER}

echo "Enter database name (press Enter to use 'personal_finance'):"
read -r db_name
db_name=${db_name:-personal_finance}

echo ""
echo -e "${YELLOW}Creating database...${NC}"

# Create database if it doesn't exist
createdb -U "$db_user" "$db_name" 2>/dev/null || echo "Database already exists"

# Execute schema
echo -e "${YELLOW}Creating tables...${NC}"
psql -U "$db_user" -d "$db_name" -f finance_schema.sql

echo -e "${GREEN}✅ Database configured${NC}"

# 7. Create .env file
echo ""
echo -e "${YELLOW}⚙️  Configuring environment variables...${NC}"

if [ ! -f .env ]; then
    cp .env.example .env
    
    # Ask for password
    echo "Enter your PostgreSQL password (leave empty if none):"
    read -s db_password
    
    # Update .env
    sed -i.bak "s/DB_USER=.*/DB_USER=$db_user/" .env
    sed -i.bak "s/DB_NAME=.*/DB_NAME=$db_name/" .env
    sed -i.bak "s/DB_PASSWORD=.*/DB_PASSWORD=$db_password/" .env
    rm .env.bak
    
    echo -e "${GREEN}✅ .env file created${NC}"
else
    echo -e "${YELLOW}⚠️  .env file already exists. Not overwriting.${NC}"
fi

# 8. Set permissions for Messages access
echo ""
echo -e "${YELLOW}🔐 Setting up permissions...${NC}"
echo ""
echo -e "${YELLOW}IMPORTANT:${NC}"
echo "1. Open 'System Settings' → 'Privacy & Security'"
echo "2. Go to 'Full Disk Access'"
echo "3. Add Terminal (or your code editor)"
echo "4. This allows the script to read Messages database"
echo ""
echo "Press Enter when you've granted permissions..."
read

# 9. Make scripts executable
chmod +x transaction_extractor.py
chmod +x setup_cron.sh

# 10. Test run
echo ""
echo -e "${GREEN}✅ Installation completed!${NC}"
echo ""
echo -e "${YELLOW}🧪 Running test extraction...${NC}"
python3 transaction_extractor.py

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Check the logs in: transaction_extractor.log"
echo "2. Set up automatic execution every 6 hours:"
echo "   ./setup_cron.sh"
echo ""
echo "To run manually:"
echo "  source venv/bin/activate"
echo "  python3 transaction_extractor.py"
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
