# 🚀 Quick Start - Local Testing

Test offline voice recognition on your computer in 5 minutes!

## ⚡ Quick Commands

```bash
# 1. Setup (one time only)
cd raspberry-pi-kiosk
./local-setup.sh

# 2. Start voice recognition
./test-local-voice.sh

# 3. In another terminal, start frontend
cd ../frontend
npm run dev

# 4. Open browser
# http://localhost:3002/kiosk-display

# 5. Click 🎤 button and speak!
```

## 🎤 Test Keywords

Speak these in Greek:

- **"ανακοινώσεις"** → Announcements slide
- **"ψηφοφορίες"** → Votes slide
- **"οικονομικά"** → Financial slide
- **"συντήρηση"** → Maintenance slide
- **"επόμενο"** → Next slide
- **"προηγούμενο"** → Previous slide

## 📊 What You'll See

**In Python terminal:**
```
🎤 Recognized: 'ανακοινώσεις'
✅ Matched keyword: announcements → slide
```

**In browser:**
- Green pulsing dot when listening
- Slide changes automatically
- Last command displayed
- "🖥️ Offline" badge visible

## 🔧 Toggle Online/Offline

Click the **🖥️ Offline** / **☁️ Online** button to switch between:

- **🖥️ Offline** - Vosk + WebSocket (no internet!)
- **☁️ Online** - Google Web Speech API (internet required)

## ❓ Troubleshooting

### Voice not recognized?
```bash
# Check if Python script is running
# Look for "👂 Listening for keywords..."
```

### WebSocket not connecting?
```bash
# In browser console (F12):
const ws = new WebSocket('ws://localhost:8765');
ws.onopen = () => console.log('✅ Works!');
```

### Microphone issues?
```bash
# Linux
arecord -l

# Test recording
arecord -d 3 test.wav && aplay test.wav
```

## 📁 Files Structure

```
raspberry-pi-kiosk/
├── local-setup.sh                    # Run this first
├── test-local-voice.sh               # Start voice recognition
├── voice-keyword-spotter.py          # Python service
└── vosk-model-small-el-gr-0.7/       # Greek model (downloaded)
```

## 🎯 Next Steps

Once working locally:

1. **Test thoroughly** - Try all keywords
2. **Deploy to Raspberry Pi** - Use `setup-offline-voice-kiosk.sh`
3. **Production ready!** - 100% offline kiosk

---

**Ready? Run `./local-setup.sh` and start testing!** 🎤