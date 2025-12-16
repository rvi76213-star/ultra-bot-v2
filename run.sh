#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════╗"
echo "║         🤖 YOUR CRUSH BOT SETUP SCRIPT           ║"
echo "║           👑 RANA (MASTER 🪓)                   ║"
echo "╚══════════════════════════════════════════════════╝"
echo -e "${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    print_warning "Running as root is not recommended!"
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js not found! Please install Node.js 18+ first."
    echo "Download from: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1)

if [ $NODE_MAJOR -lt 18 ]; then
    print_error "Node.js version must be 18 or higher. Current: $NODE_VERSION"
    exit 1
fi

print_status "Node.js found: v$NODE_VERSION"

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm not found!"
    exit 1
fi

print_status "npm found: $(npm --version)"

# Create necessary directories
print_status "Creating directory structure..."
mkdir -p src/secure data/fun-json data/admin-photos data/logs config assets/owner-photos assets/media .github/workflows

# Install dependencies
print_status "Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    print_error "Failed to install dependencies!"
    exit 1
fi

# Check if appstate exists
if [ ! -f "src/secure/appstate.json" ]; then
    print_warning "appstate.json not found!"
    echo -e "${YELLOW}You need to login to Facebook first.${NC}"
    echo ""
    read -p "Do you want to login now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Starting login process..."
        node login.js
    else
        print_warning "You can login later with: npm run login"
    fi
else
    print_status "appstate.json found!"
fi

# Check config files
if [ ! -f "config/config.json" ]; then
    print_warning "Creating default config.json..."
    cat > config/config.json << EOL
{
  "prefix": "!",
  "admins": ["100000000000001"],
  "autoAddFriend": true,
  "autoShare": true,
  "maxGroups": 50,
  "logLevel": "info",
  "language": "bn",
  "ownerName": "RANA (MASTER 🪓)",
  "ownerLocation": "Faridpur, Dhaka, Bangladesh",
  "ownerEmail": "ranaeditz333@gmail.com",
  "ownerPhone": "01847634486"
}
EOL
    print_status "config.json created!"
fi

if [ ! -f "config/settings.json" ]; then
    print_warning "Creating default settings.json..."
    cat > config/settings.json << EOL
{
  "delay": {
    "min": 300,
    "max": 600
  },
  "photo": {
    "ownerCount": 12,
    "adminMax": 3
  },
  "security": {
    "maxCommandsPerMinute": 30,
    "blockSpam": true
  },
  "features": {
    "funEnabled": true,
    "autoReply": false,
    "welcomeMessage": true
  }
}
EOL
    print_status "settings.json created!"
fi

# Create owner photos file
if [ ! -f "assets/owner-photos/ownerPhotos.json" ]; then
    print_warning "Creating ownerPhotos.json..."
    cat > assets/owner-photos/ownerPhotos.json << EOL
[
  "https://i.ibb.co/XXX1/owner1.jpg",
  "https://i.ibb.co/XXX2/owner2.jpg",
  "https://i.ibb.co/XXX3/owner3.jpg",
  "https://i.ibb.co/XXX4/owner4.jpg",
  "https://i.ibb.co/XXX5/owner5.jpg",
  "https://i.ibb.co/XXX6/owner6.jpg",
  "https://i.ibb.co/XXX7/owner7.jpg",
  "https://i.ibb.co/XXX8/owner8.jpg",
  "https://i.ibb.co/XXX9/owner9.jpg",
  "https://i.ibb.co/XXX10/owner10.jpg",
  "https://i.ibb.co/XXX11/owner11.jpg",
  "https://i.ibb.co/XXX12/owner12.jpg"
]
EOL
    print_status "ownerPhotos.json created! (Update URLs with your own)"
fi

# Create fun JSON files
print_status "Creating fun JSON files..."

# chor.json
cat > data/fun-json/chor.json << EOL
[
  "চোর ধর চোর! 🏃‍♂️",
  "চোর পালাচ্ছে! 🚨",
  "ধর ধর চোর! 👮",
  "ওই যে চোর! 🕵️",
  "চোর ধরা পড়ল! 🎉",
  "সবাই মিলে চোর ধর! 👥",
  "চোরের শেষ রক্ষা নাই! ⚖️",
  "চোর শনাক্ত! 🔍",
  "আলট্রা চোর! 🦸",
  "চোর ভাই কেমন আছেন? 😂",
  "চোর চোর চোর! 🎯",
  "চোর আটক! 🔒"
]
EOL

# murgi.json
cat > data/fun-json/murgi.json << EOL
[
  "মুরগি উড়ল! 🐔✈️",
  "মুরগি ডিম দিল! 🥚",
  "কুকড়া কু! 🐓",
  "মুরগি পালাচ্ছে! 🏃‍♀️",
  "মুরগি ধর! 🎯",
  "ফ্রাইড চিকেন! 🍗",
  "মুরগির বাচ্চা! 🐤",
  "কোরবানির মুরগি! 🕌",
  "মুরগি মার খায়! 🥊",
  "লিভ মুরগি! 🐔",
  "মুরগি ভাজা! 🍳",
  "মুরগি সর্পিল! 🌀"
]
EOL

# abal.json
cat > data/fun-json/abal.json << EOL
[
  "আবাল শুরু! 🎭",
  "আবাল টাইম! ⏰",
  "আবাল আবাল! 🤪",
  "আবাল মোড এক্টিভেট! 🚀",
  "আবাল পাওয়ার! 💪",
  "আবাল লেভেল ম্যাক্স! 📈",
  "আবাল গেম শুরু! 🎮",
  "আবাল অ্যাটাক! ⚔️",
  "আবাল ডিফেন্স! 🛡️",
  "আবাল ফাইনাল! 🏆"
]
EOL

# senior.json
cat > data/fun-json/senior.json << EOL
[
  "সিনিয়র এলো! 👴",
  "সিনিয়রের সম্মান! 🙏",
  "সিনিয়র টিচার! 👨‍🏫",
  "সিনিয়র অ্যাডভাইস! 💡",
  "সিনিয়র পাওয়ার! 🔥",
  "সিনিয়র মোড! 🎩",
  "সিনিয়র কম্যান্ড! ⚡",
  "সিনিয়র প্রেজেন্স! 👑",
  "সিনিয়র বুদ্ধি! 🧠",
  "সিনিয়র ফাইনাল! 🏁"
]
EOL

# cow.json
cat > data/fun-json/cow.json << EOL
[
  "গরু মো! 🐄",
  "গরু চরছে! 🌾",
  "গরুর দুধ! 🥛",
  "গরু পাল! 🐮",
  "গরু মার্কেট! 🏪",
  "গরু হাম্বা! 🔊",
  "গরু রেস! 🏃‍♂️",
  "গরু ফার্ম! 🏞️",
  "গরু বাচ্চা! 🐂",
  "গরু কিং! 👑"
]
EOL

# goat.json
cat > data/fun-json/goat.json << EOL
[
  "ছাগল মে! 🐐",
  "ছাগল চরছে! 🌿",
  "ছাগলের দৌড়! 🏃",
  "ছাগল রাজা! 🤴",
  "ছাগল আর্টিস্ট! 🎨",
  "ছাগল জাম্প! 🦘",
  "ছাগল ফ্যামিলি! 👨‍👩‍👧‍👦",
  "ছাগল পলিটিশিয়ান! 🎭",
  "ছাগল স্টাইল! 💃",
  "ছাগল লিজেন্ড! 🌟"
]
EOL

print_status "Fun JSON files created!"

# Create sample admin photos directory
print_status "Setting up admin photos..."
touch data/admin-photos/.keep

# Create logs directory
print_status "Setting up logs..."
touch data/logs/.keep

# Make start.js executable
chmod +x start.js 2>/dev/null || true

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}✅ SETUP COMPLETED SUCCESSFULLY!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo -e "${YELLOW}📋 NEXT STEPS:${NC}"
echo "1. If not logged in yet, run: ${GREEN}npm run login${NC}"
echo "2. Update owner photo URLs in: ${GREEN}assets/owner-photos/ownerPhotos.json${NC}"
echo "3. Edit admin UIDs in: ${GREEN}config/config.json${NC}"
echo "4. Start the bot: ${GREEN}npm start${NC}"
echo ""
echo -e "${BLUE}💡 TIP: Use './run.sh' anytime to re-run setup${NC}"
echo ""
echo -e "${YELLOW}📞 Support:${NC}"
echo "   Developer: RANA (MASTER 🪓)"
echo "   Email: ranaeditz333@gmail.com"
echo "   Telegram: @rana_editz_00"
echo ""