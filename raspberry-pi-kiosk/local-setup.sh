#!/bin/bash
# Local Development Setup for Offline Voice Recognition
# Run this on your computer to test before deploying to Raspberry Pi

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🎤 Local Voice Recognition Setup${NC}"
echo "=================================="
echo ""

# Step 1: Check Python
echo -e "${BLUE}Step 1/4: Checking Python...${NC}"
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo -e "${GREEN}✓ Python found: $PYTHON_VERSION${NC}"
else
    echo -e "${RED}✗ Python 3 not found${NC}"
    echo "Please install Python 3.9 or higher"
    exit 1
fi

# Step 2: Create virtual environment
echo ""
echo -e "${BLUE}Step 2/4: Creating virtual environment...${NC}"
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo -e "${GREEN}✓ Virtual environment created${NC}"
else
    echo -e "${YELLOW}⚠ Virtual environment already exists${NC}"
fi

# Activate virtual environment
source venv/bin/activate 2>/dev/null || . venv/Scripts/activate 2>/dev/null

# Step 3: Install Python packages
echo ""
echo -e "${BLUE}Step 3/4: Installing Python packages...${NC}"
pip install --quiet --upgrade pip
pip install --quiet vosk sounddevice websockets
echo -e "${GREEN}✓ Packages installed${NC}"

# Step 4: Download Vosk model
echo ""
echo -e "${BLUE}Step 4/4: Downloading Greek voice model...${NC}"
MODEL_NAME="vosk-model-small-el-gr-0.7"
MODEL_URL="https://alphacephei.com/vosk/models/${MODEL_NAME}.zip"

if [ -d "$MODEL_NAME" ]; then
    echo -e "${YELLOW}⚠ Model already exists: $MODEL_NAME${NC}"
else
    echo "📥 Downloading $MODEL_NAME (~45MB)..."
    echo "   This may take a few minutes..."

    if command -v wget &> /dev/null; then
        wget -q --show-progress "$MODEL_URL"
    elif command -v curl &> /dev/null; then
        curl -L -o "${MODEL_NAME}.zip" "$MODEL_URL"
    else
        echo -e "${RED}✗ Neither wget nor curl found${NC}"
        echo "Please install wget or curl, or download manually:"
        echo "   $MODEL_URL"
        exit 1
    fi

    echo "📦 Extracting model..."
    unzip -q "${MODEL_NAME}.zip"
    rm "${MODEL_NAME}.zip"
    echo -e "${GREEN}✓ Model downloaded and extracted${NC}"
fi

# Step 5: Create test script
echo ""
echo -e "${BLUE}Creating test script...${NC}"
cat > test-local-voice.sh <<'EOF'
#!/bin/bash
# Quick test script for local voice recognition

# Activate virtual environment
source venv/bin/activate 2>/dev/null || . venv/Scripts/activate 2>/dev/null

# Set model path
export VOSK_MODEL_PATH=./vosk-model-small-el-gr-0.7

echo "🎤 Starting voice recognition..."
echo ""
echo "📋 Configured keywords:"
echo "   • ανακοινώσεις (announcements)"
echo "   • ψηφοφορίες (votes)"
echo "   • οικονομικά (financial)"
echo "   • συντήρηση (maintenance)"
echo "   • επόμενο (next)"
echo "   • προηγούμενο (previous)"
echo ""
echo "👂 Listening... Speak in Greek!"
echo ""

# Run voice spotter
python3 voice-keyword-spotter.py
EOF

chmod +x test-local-voice.sh

# Completion
echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Start voice recognition:"
echo -e "   ${BLUE}./test-local-voice.sh${NC}"
echo ""
echo "2. In another terminal, start frontend:"
echo -e "   ${BLUE}cd ../frontend && npm run dev${NC}"
echo ""
echo "3. Open browser:"
echo -e "   ${BLUE}http://localhost:3002/kiosk-display${NC}"
echo ""
echo "4. Click 🎤 button and speak Greek keywords!"
echo ""
echo "🎤 Test keywords:"
echo "   • ανακοινώσεις"
echo "   • ψηφοφορίες"
echo "   • οικονομικά"
echo "   • συντήρηση"
echo ""
echo "📚 For more info, see LOCAL_SETUP.md"
echo ""