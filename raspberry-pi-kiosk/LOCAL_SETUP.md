# 🖥️ Local Testing Setup - Offline Voice Recognition

Test the offline voice recognition on your computer before deploying to Raspberry Pi.

## 🚀 Quick Start

### 1. Install Python Dependencies

```bash
cd raspberry-pi-kiosk

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows

# Install packages
pip install vosk sounddevice websockets
```

### 2. Download Greek Voice Model

```bash
# Download small Greek model (~45MB)
wget https://alphacephei.com/vosk/models/vosk-model-small-el-gr-0.7.zip

# Extract
unzip vosk-model-small-el-gr-0.7.zip

# Cleanup
rm vosk-model-small-el-gr-0.7.zip
```

### 3. Start Voice Spotter

```bash
# Set model path
export VOSK_MODEL_PATH=./vosk-model-small-el-gr-0.7

# Run
python3 voice-keyword-spotter.py
```

You should see:
```
🎤 Initializing Keyword Spotter...
📦 Loading model from ./vosk-model-small-el-gr-0.7...
✅ Model loaded successfully
🔑 Monitoring 25 keywords
🌐 Starting WebSocket server on port 8765...
👂 Listening for keywords...
```

### 4. Test Frontend Connection

Open another terminal:

```bash
# Start frontend development server
cd ../frontend
npm run dev
```

Open browser: `http://localhost:3002/kiosk-display`

Click 🎤 button and speak: **"ανακοινώσεις"**

## 🔧 Troubleshooting

### Microphone Not Working

**Linux:**
```bash
# List audio devices
arecord -l

# Test recording
arecord -d 3 test.wav
aplay test.wav
```

**Mac:**
```bash
# Grant microphone permission in System Preferences
# Security & Privacy → Microphone → Terminal
```

**Windows:**
```bash
# Check audio devices
python -c "import sounddevice as sd; print(sd.query_devices())"
```

### WebSocket Connection Failed

Check if service is running:
```bash
# Should show "Starting WebSocket server"
python3 voice-keyword-spotter.py
```

Test WebSocket in browser console:
```javascript
const ws = new WebSocket('ws://localhost:8765');
ws.onopen = () => console.log('✅ Connected');
ws.onerror = (e) => console.error('❌ Error:', e);
```

### Model Not Found

```bash
# Check if model exists
ls -lh vosk-model-small-el-gr-0.7/

# Should contain:
# - am/
# - graph/
# - conf/
# - README
```

## 🎤 Testing Keywords

Speak these Greek keywords:

### Slide Navigation
- **"ανακοινώσεις"** → Announcements
- **"ψηφοφορίες"** → Votes
- **"οικονομικά"** → Financial
- **"συντήρηση"** → Maintenance

### Commands
- **"επόμενο"** → Next slide
- **"προηγούμενο"** → Previous slide
- **"αρχική"** → Home

You should see in the Python terminal:
```
🎤 Recognized: 'ανακοινώσεις'
✅ Matched keyword: announcements → slide
```

And in the browser: slide changes automatically!

## 📊 Expected Performance

| Metric | Local Computer | Raspberry Pi 4 |
|--------|----------------|----------------|
| **Recognition Latency** | 50-100ms | 100-150ms |
| **CPU Usage** | 5-10% | 10-15% |
| **RAM Usage** | 100-150MB | 150-200MB |

## 🐛 Common Issues

### Issue: "Permission denied" for microphone

**Solution:**
```bash
# Linux: Add user to audio group
sudo usermod -a -G audio $USER
# Log out and log back in

# Mac: Grant Terminal microphone access
# System Preferences → Security → Microphone

# Windows: Check app permissions
# Settings → Privacy → Microphone
```

### Issue: "No module named 'vosk'"

**Solution:**
```bash
# Make sure virtual environment is activated
source venv/bin/activate

# Reinstall
pip install vosk sounddevice websockets
```

### Issue: Keywords not recognized

**Solution:**
1. Speak clearly in Greek
2. Reduce background noise
3. Check microphone volume:
   ```bash
   # Linux
   alsamixer

   # Mac
   System Preferences → Sound → Input
   ```

## 🔧 Advanced Testing

### Test WebSocket Only

```python
# test_websocket.py
import asyncio
import websockets

async def test():
    async with websockets.connect('ws://localhost:8765') as ws:
        print('✅ Connected!')
        async for message in ws:
            print(f'📥 Received: {message}')

asyncio.run(test())
```

### Test Microphone Only

```python
# test_mic.py
import sounddevice as sd

print("🎤 Available devices:")
print(sd.query_devices())

print("\n🔊 Recording 3 seconds...")
recording = sd.rec(int(3 * 16000), samplerate=16000, channels=1)
sd.wait()
print("✅ Recording complete!")

print("🔊 Playing back...")
sd.play(recording, 16000)
sd.wait()
```

### Test Vosk Recognition

```python
# test_vosk.py
import json
from vosk import Model, KaldiRecognizer
import sounddevice as sd

model = Model("vosk-model-small-el-gr-0.7")
rec = KaldiRecognizer(model, 16000)

print("🎤 Speak now (3 seconds)...")

with sd.RawInputStream(samplerate=16000, blocksize=8000, dtype='int16', channels=1) as stream:
    import time
    start = time.time()
    while time.time() - start < 3:
        data, _ = stream.read(8000)
        if rec.AcceptWaveform(bytes(data)):
            result = json.loads(rec.Result())
            print(f"📝 Recognized: {result.get('text', '')}")
```

## 🎯 Integration Testing

Test with actual kiosk display:

1. **Start voice spotter:**
   ```bash
   python3 voice-keyword-spotter.py
   ```

2. **Start frontend:**
   ```bash
   cd ../frontend
   npm run dev
   ```

3. **Open kiosk:**
   ```
   http://localhost:3002/kiosk-display
   ```

4. **Click 🎤 button** (should show green dot)

5. **Speak keywords** and watch slides change!

## 📦 Production Deployment

When ready for Raspberry Pi:

```bash
# Copy files to Pi
scp voice-keyword-spotter.py pi@kiosk-display.local:~/
scp setup-offline-voice-kiosk.sh pi@kiosk-display.local:~/

# SSH to Pi
ssh pi@kiosk-display.local

# Run setup
sudo ./setup-offline-voice-kiosk.sh
```

## 🔄 Development Workflow

```bash
# 1. Make changes to voice-keyword-spotter.py
nano voice-keyword-spotter.py

# 2. Test locally
python3 voice-keyword-spotter.py

# 3. If working, commit
git add .
git commit -m "Update voice recognition"
git push

# 4. Deploy to Pi
scp voice-keyword-spotter.py pi@kiosk-display.local:~/
ssh pi@kiosk-display.local "sudo systemctl restart voice-spotter"
```

---

**Ready for local testing!** 🎤

Run `python3 voice-keyword-spotter.py` and start speaking Greek keywords!