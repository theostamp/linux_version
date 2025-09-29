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
    xdotool \
    unclutter \
    x11-xserver-utils \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
RUN pip3 install SpeechRecognition pyaudio requests

# Create kiosk user
RUN useradd -m -s /bin/bash kiosk

# Copy kiosk files
COPY ../kiosk.sh /home/kiosk/
COPY ../voice-recognition.py /home/kiosk/
COPY ../voice-kiosk.sh /home/kiosk/

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
