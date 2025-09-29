#!/bin/bash
# Docker Simulation Script for Kiosk Testing
# This script creates a Docker container to simulate the Raspberry Pi kiosk environment

set -e

echo "🐳 Building Docker Kiosk Simulation..."

# Create Dockerfile if it doesn't exist
if [ ! -f docker/Dockerfile ]; then
    echo "📁 Creating Docker configuration..."
    mkdir -p docker
    
    cat > docker/Dockerfile << 'EOF'
FROM ubuntu:22.04

# Install required packages
RUN apt-get update && apt-get install -y \
    chromium-browser \
    xvfb \
    x11vnc \
    fluxbox \
    wget \
    curl \
    python3 \
    python3-pip \
    espeak \
    alsa-utils \
    pulseaudio \
    portaudio19-dev \
    python3-pyaudio \
    flac \
    sox \
    libsox-fmt-all \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
RUN pip3 install SpeechRecognition pyaudio requests

# Create kiosk user
RUN useradd -m -s /bin/bash kiosk

# Copy kiosk files
COPY kiosk.sh /home/kiosk/
COPY voice-recognition.py /home/kiosk/
COPY voice-kiosk.sh /home/kiosk/

# Set permissions
RUN chmod +x /home/kiosk/kiosk.sh
RUN chmod +x /home/kiosk/voice-kiosk.sh
RUN chmod +x /home/kiosk/voice-recognition.py

# Set working directory
WORKDIR /home/kiosk

# Expose VNC port
EXPOSE 5900

# Start script
CMD ["/home/kiosk/kiosk.sh"]
EOF
fi

# Create docker-compose.yml if it doesn't exist
if [ ! -f docker/docker-compose.yml ]; then
    cat > docker/docker-compose.yml << 'EOF'
version: '3.8'

services:
  kiosk-simulation:
    build: .
    ports:
      - "5900:5900"  # VNC port
      - "3000:3000"  # Web interface port
    environment:
      - DISPLAY=:1
    volumes:
      - /tmp/.X11-unix:/tmp/.X11-unix:rw
    devices:
      - /dev/snd:/dev/snd
    privileged: true
    command: >
      bash -c "
        Xvfb :1 -screen 0 1024x768x24 &
        export DISPLAY=:1
        fluxbox &
        x11vnc -display :1 -nopw -listen localhost -xkb -ncache 10 -ncache_cr -forever &
        sleep 5
        /home/kiosk/kiosk.sh
      "
EOF
fi

# Build and run the simulation
echo "🔨 Building Docker image..."
cd docker
docker build -t kiosk-simulation .

echo "🚀 Starting kiosk simulation..."
echo "📱 VNC will be available at: localhost:5900"
echo "🌐 Web interface will be available at: localhost:3000"
echo ""
echo "To connect via VNC:"
echo "1. Install VNC viewer"
echo "2. Connect to localhost:5900"
echo "3. You should see the kiosk interface"
echo ""
echo "Press Ctrl+C to stop the simulation"

# Run the container
docker run --rm -it \
    -p 5900:5900 \
    -p 3000:3000 \
    --device /dev/snd \
    --privileged \
    kiosk-simulation
