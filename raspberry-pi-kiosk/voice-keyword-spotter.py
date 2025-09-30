#!/usr/bin/env python3
"""
Offline Voice Keyword Spotter for Kiosk Display
Uses Vosk for offline Greek speech recognition
Only recognizes configured keywords
"""

import json
import sys
import os
import queue
import sounddevice as sd
import vosk
import asyncio
import websockets
from pathlib import Path

# Configuration
SAMPLE_RATE = 16000
BLOCK_SIZE = 8000
WEBSOCKET_PORT = 8765

# Keywords mapping (Greek → Command)
KEYWORDS = {
    # Slide navigation
    'ανακοινώσεις': {'action': 'slide', 'index': 0, 'name': 'announcements'},
    'ανακοίνωση': {'action': 'slide', 'index': 0, 'name': 'announcements'},
    'ψηφοφορίες': {'action': 'slide', 'index': 1, 'name': 'votes'},
    'ψηφοφορία': {'action': 'slide', 'index': 1, 'name': 'votes'},
    'οικονομικά': {'action': 'slide', 'index': 2, 'name': 'financial'},
    'χρήματα': {'action': 'slide', 'index': 2, 'name': 'financial'},
    'συντήρηση': {'action': 'slide', 'index': 3, 'name': 'maintenance'},
    'επισκευές': {'action': 'slide', 'index': 3, 'name': 'maintenance'},

    # Navigation commands
    'επόμενο': {'action': 'next', 'name': 'next'},
    'επόμενη': {'action': 'next', 'name': 'next'},
    'προηγούμενο': {'action': 'previous', 'name': 'previous'},
    'προηγούμενη': {'action': 'previous', 'name': 'previous'},
    'πίσω': {'action': 'previous', 'name': 'back'},
    'αρχική': {'action': 'home', 'name': 'home'},
    'κύρια': {'action': 'home', 'name': 'home'},
    'αρχή': {'action': 'home', 'name': 'home'},

    # Playback control
    'παύση': {'action': 'pause', 'name': 'pause'},
    'σταμάτα': {'action': 'pause', 'name': 'pause'},
    'συνέχεια': {'action': 'resume', 'name': 'resume'},
    'ξεκίνα': {'action': 'resume', 'name': 'resume'},

    # Numbers (for direct slide access)
    'ένα': {'action': 'slide', 'index': 0, 'name': 'one'},
    'μία': {'action': 'slide', 'index': 0, 'name': 'one'},
    'δύο': {'action': 'slide', 'index': 1, 'name': 'two'},
    'τρία': {'action': 'slide', 'index': 2, 'name': 'three'},
    'τέσσερα': {'action': 'slide', 'index': 3, 'name': 'four'},
}


class KeywordSpotter:
    def __init__(self, model_path):
        """Initialize keyword spotter with Vosk model"""
        self.model_path = model_path
        self.model = None
        self.recognizer = None
        self.audio_queue = queue.Queue()
        self.connected_clients = set()

        print("🎤 Initializing Keyword Spotter...")
        self._load_model()

    def _load_model(self):
        """Load Vosk model"""
        if not os.path.exists(self.model_path):
            print(f"❌ Error: Model not found at {self.model_path}")
            print("📥 Download Greek model from: https://alphacephei.com/vosk/models")
            print("   Recommended: vosk-model-small-el-gr-0.7")
            sys.exit(1)

        print(f"📦 Loading model from {self.model_path}...")
        self.model = vosk.Model(self.model_path)
        self.recognizer = vosk.KaldiRecognizer(self.model, SAMPLE_RATE)

        # Configure recognizer for keywords only
        keyword_list = list(KEYWORDS.keys())
        self.recognizer.SetWords(True)

        print(f"✅ Model loaded successfully")
        print(f"🔑 Monitoring {len(KEYWORDS)} keywords")

    def audio_callback(self, indata, frames, time, status):
        """Audio stream callback"""
        if status:
            print(f"⚠️  Audio status: {status}")
        self.audio_queue.put(bytes(indata))

    def match_keyword(self, text):
        """Match recognized text against keywords"""
        text_lower = text.lower().strip()

        # Direct match
        if text_lower in KEYWORDS:
            return KEYWORDS[text_lower]

        # Partial match (keyword in sentence)
        words = text_lower.split()
        for word in words:
            if word in KEYWORDS:
                return KEYWORDS[word]

        # Fuzzy match for common mistakes
        for keyword, command in KEYWORDS.items():
            if keyword in text_lower or text_lower in keyword:
                return command

        return None

    async def broadcast_command(self, command):
        """Broadcast command to all connected WebSocket clients"""
        if not self.connected_clients:
            return

        message = json.dumps({
            'type': 'voice_command',
            'action': command['action'],
            'index': command.get('index'),
            'name': command['name'],
            'timestamp': asyncio.get_event_loop().time()
        })

        # Broadcast to all clients
        websockets_to_remove = set()
        for websocket in self.connected_clients:
            try:
                await websocket.send(message)
            except websockets.exceptions.ConnectionClosed:
                websockets_to_remove.add(websocket)

        # Remove closed connections
        self.connected_clients -= websockets_to_remove

    async def websocket_handler(self, websocket, path):
        """Handle WebSocket connections"""
        self.connected_clients.add(websocket)
        print(f"📡 Client connected. Total clients: {len(self.connected_clients)}")

        try:
            # Keep connection alive
            async for message in websocket:
                # Echo back (for testing)
                await websocket.send(message)
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            self.connected_clients.remove(websocket)
            print(f"📡 Client disconnected. Total clients: {len(self.connected_clients)}")

    async def start_websocket_server(self):
        """Start WebSocket server"""
        print(f"🌐 Starting WebSocket server on port {WEBSOCKET_PORT}...")
        async with websockets.serve(self.websocket_handler, "0.0.0.0", WEBSOCKET_PORT):
            await asyncio.Future()  # Run forever

    def process_audio(self):
        """Process audio stream and detect keywords"""
        print("👂 Listening for keywords...")
        print("=" * 50)

        with sd.RawInputStream(samplerate=SAMPLE_RATE, blocksize=BLOCK_SIZE,
                               dtype='int16', channels=1,
                               callback=self.audio_callback):

            while True:
                # Get audio data
                data = self.audio_queue.get()

                # Process with Vosk
                if self.recognizer.AcceptWaveform(data):
                    # Complete utterance recognized
                    result = json.loads(self.recognizer.Result())
                    text = result.get('text', '')

                    if text:
                        print(f"🎤 Recognized: '{text}'")

                        # Match against keywords
                        command = self.match_keyword(text)
                        if command:
                            print(f"✅ Matched keyword: {command['name']} → {command['action']}")

                            # Broadcast to frontend
                            asyncio.create_task(self.broadcast_command(command))
                        else:
                            print(f"❓ No keyword match")

                else:
                    # Partial result (streaming)
                    partial = json.loads(self.recognizer.PartialResult())
                    partial_text = partial.get('partial', '')
                    if partial_text:
                        # Check for keywords in partial results
                        command = self.match_keyword(partial_text)
                        if command:
                            print(f"⚡ Quick match: {command['name']}")
                            asyncio.create_task(self.broadcast_command(command))


async def main():
    """Main function"""
    print("=" * 50)
    print("🎤 Offline Voice Keyword Spotter")
    print("   For Building Management Kiosk")
    print("=" * 50)
    print()

    # Model path (configurable)
    model_path = os.environ.get('VOSK_MODEL_PATH', '/home/pi/vosk-model-small-el-gr-0.7')

    # Check if model exists
    if not os.path.exists(model_path):
        print(f"❌ Vosk model not found at: {model_path}")
        print()
        print("📥 To install:")
        print("   1. Download model: wget https://alphacephei.com/vosk/models/vosk-model-small-el-gr-0.7.zip")
        print("   2. Extract: unzip vosk-model-small-el-gr-0.7.zip")
        print(f"   3. Move to: {model_path}")
        print()
        print("   Or set VOSK_MODEL_PATH environment variable")
        sys.exit(1)

    # Initialize spotter
    spotter = KeywordSpotter(model_path)

    # Start WebSocket server in background
    asyncio.create_task(spotter.start_websocket_server())

    # Start audio processing (blocking)
    await asyncio.get_event_loop().run_in_executor(None, spotter.process_audio)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🛑 Stopping keyword spotter...")
        sys.exit(0)
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)