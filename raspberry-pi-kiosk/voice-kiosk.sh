#!/bin/bash
# Voice-Enabled Building Management Kiosk
# /home/pi/voice-kiosk.sh

# Configuration
KIOSK_URL="http://your-server:3000/kiosk?building_id=1&voice_enabled=true"
CHROME_FLAGS="--kiosk --no-first-run --disable-infobars --disable-session-crashed-bubble --disable-dev-shm-usage --disable-gpu --no-sandbox --disable-web-security --user-data-dir=/tmp/chrome-kiosk --enable-speech-input --enable-speech-synthesis"

# Audio configuration
AUDIO_DEVICE="default"
MICROPHONE_DEVICE="default"
SPEAKER_DEVICE="default"

# Voice recognition settings
VOICE_LANGUAGE="el-GR"  # Greek language
VOICE_TIMEOUT=5
VOICE_SENSITIVITY=0.5

# Disable screen blanking
xset s off
xset -dpms
xset s noblank

# Hide cursor
unclutter -idle 0.5 -root &

# Configure audio devices
echo "🔊 Configuring audio devices..."
pactl set-default-source $MICROPHONE_DEVICE
pactl set-default-sink $SPEAKER_DEVICE

# Test audio devices
echo "🎤 Testing microphone..."
timeout 3s arecord -f cd -t wav /tmp/mic_test.wav
if [ $? -eq 0 ]; then
    echo "✅ Microphone working"
else
    echo "❌ Microphone not working"
fi

echo "🔊 Testing speakers..."
speaker-test -t wav -c 2 -l 1 -D $SPEAKER_DEVICE &
SPEAKER_PID=$!
sleep 2
kill $SPEAKER_PID 2>/dev/null

# Start voice recognition service
echo "🎤 Starting voice recognition service..."
python3 /home/pi/voice-recognition.py &
VOICE_PID=$!

# Start Chromium in kiosk mode
echo "🌐 Starting kiosk browser..."
chromium-browser $CHROME_FLAGS "$KIOSK_URL" &
CHROME_PID=$!

# Wait for Chromium to start
sleep 5

# Make sure Chromium is in fullscreen
xdotool key F11

# Function to handle voice commands
handle_voice_command() {
    local command="$1"
    echo "🎤 Voice command received: $command"
    
    case "$command" in
        "ανακοινώσεις"|"announcements")
            xdotool key ctrl+l
            xdotool type "http://your-server:3000/kiosk?building_id=1&page=announcements"
            xdotool key Return
            ;;
        "ψηφοφορίες"|"votes")
            xdotool key ctrl+l
            xdotool type "http://your-server:3000/kiosk?building_id=1&page=votes"
            xdotool key Return
            ;;
        "οικονομικά"|"financial")
            xdotool key ctrl+l
            xdotool type "http://your-server:3000/kiosk?building_id=1&page=financial"
            xdotool key Return
            ;;
        "συντήρηση"|"maintenance")
            xdotool key ctrl+l
            xdotool type "http://your-server:3000/kiosk?building_id=1&page=maintenance"
            xdotool key Return
            ;;
        "αρχική"|"home"|"κύρια")
            xdotool key ctrl+l
            xdotool type "http://your-server:3000/kiosk?building_id=1"
            xdotool key Return
            ;;
        "ανανέωση"|"refresh")
            xdotool key F5
            ;;
        "βοήθεια"|"help")
            # Show help overlay
            xdotool key ctrl+shift+h
            ;;
        *)
            echo "❓ Unknown command: $command"
            ;;
    esac
}

# Monitor voice recognition output
while true; do
    if [ -f /tmp/voice_command.txt ]; then
        command=$(cat /tmp/voice_command.txt)
        rm /tmp/voice_command.txt
        handle_voice_command "$command"
    fi
    sleep 0.1
done

# Cleanup on exit
cleanup() {
    echo "🛑 Shutting down voice kiosk..."
    kill $VOICE_PID 2>/dev/null
    kill $CHROME_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Keep script running
wait
