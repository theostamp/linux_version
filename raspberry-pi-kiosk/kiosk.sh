#!/bin/bash
# Basic Building Management Kiosk Startup Script
# /home/pi/kiosk.sh

# Configuration
KIOSK_URL="http://your-server:3000/kiosk?building_id=1"
CHROME_FLAGS="--kiosk --no-first-run --disable-infobars --disable-session-crashed-bubble --disable-dev-shm-usage --disable-gpu --no-sandbox --disable-web-security --user-data-dir=/tmp/chrome-kiosk"

# Disable screen blanking
xset s off
xset -dpms
xset s noblank

# Hide cursor
unclutter -idle 0.5 -root &

# Start Chromium in kiosk mode
echo "🌐 Starting kiosk browser..."
chromium-browser $CHROME_FLAGS "$KIOSK_URL" &

# Wait for Chromium to start
sleep 5

# Make sure Chromium is in fullscreen
xdotool key F11

# Keep script running
wait
