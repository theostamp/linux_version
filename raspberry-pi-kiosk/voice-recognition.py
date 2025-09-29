#!/usr/bin/env python3
"""
Voice Recognition Service for Building Management Kiosk
Handles speech-to-text conversion and command processing
"""

import speech_recognition as sr
import pyaudio
import wave
import threading
import time
import os
import json
import requests
from datetime import datetime

class VoiceKioskController:
    def __init__(self):
        self.recognizer = sr.Recognizer()
        self.microphone = sr.Microphone()
        self.is_listening = False
        self.command_history = []
        
        # Voice commands mapping (Greek and English)
        self.commands = {
            # Greek commands
            "ανακοινώσεις": "announcements",
            "ψηφοφορίες": "votes", 
            "οικονομικά": "financial",
            "συντήρηση": "maintenance",
            "αρχική": "home",
            "κύρια": "home",
            "ανανέωση": "refresh",
            "βοήθεια": "help",
            "πληροφορίες": "info",
            "καιρός": "weather",
            "ώρα": "time",
            "ημερομηνία": "date",
            
            # English commands
            "announcements": "announcements",
            "votes": "votes",
            "financial": "financial", 
            "maintenance": "maintenance",
            "home": "home",
            "refresh": "refresh",
            "help": "help",
            "info": "info",
            "weather": "weather",
            "time": "time",
            "date": "date"
        }
        
        # Configure recognizer
        self.recognizer.energy_threshold = 300
        self.recognizer.dynamic_energy_threshold = True
        self.recognizer.pause_threshold = 0.8
        self.recognizer.phrase_threshold = 0.3
        self.recognizer.non_speaking_duration = 0.8
        
        print("🎤 Voice Kiosk Controller initialized")
        
    def calibrate_microphone(self):
        """Calibrate microphone for ambient noise"""
        print("🔧 Calibrating microphone for ambient noise...")
        with self.microphone as source:
            self.recognizer.adjust_for_ambient_noise(source, duration=2)
        print(f"✅ Energy threshold set to: {self.recognizer.energy_threshold}")
        
    def listen_for_commands(self):
        """Main listening loop"""
        self.is_listening = True
        print("👂 Listening for voice commands...")
        
        while self.is_listening:
            try:
                with self.microphone as source:
                    # Listen for audio with timeout
                    audio = self.recognizer.listen(source, timeout=1, phrase_time_limit=5)
                    
                # Recognize speech
                try:
                    # Try Greek first, then English
                    text = self.recognizer.recognize_google(audio, language='el-GR')
                    print(f"🇬🇷 Greek: {text}")
                except sr.UnknownValueError:
                    try:
                        text = self.recognizer.recognize_google(audio, language='en-US')
                        print(f"🇺🇸 English: {text}")
                    except sr.UnknownValueError:
                        continue
                except sr.RequestError as e:
                    print(f"❌ Speech recognition error: {e}")
                    continue
                
                # Process recognized text
                self.process_voice_command(text.lower())
                
            except sr.WaitTimeoutError:
                # No speech detected, continue listening
                continue
            except Exception as e:
                print(f"❌ Error in listening loop: {e}")
                time.sleep(1)
                
    def process_voice_command(self, text):
        """Process recognized voice command"""
        print(f"🎤 Processing command: '{text}'")
        
        # Check for exact matches first
        if text in self.commands:
            command = self.commands[text]
            self.execute_command(command)
            return
            
        # Check for partial matches
        for greek_cmd, english_cmd in self.commands.items():
            if greek_cmd in text or english_cmd in text:
                self.execute_command(english_cmd)
                return
                
        # Check for keywords
        if any(word in text for word in ["ανακοινώσεις", "announcements"]):
            self.execute_command("announcements")
        elif any(word in text for word in ["ψηφοφορίες", "votes"]):
            self.execute_command("votes")
        elif any(word in text for word in ["οικονομικά", "financial", "χρήματα", "money"]):
            self.execute_command("financial")
        elif any(word in text for word in ["συντήρηση", "maintenance", "επισκευές", "repairs"]):
            self.execute_command("maintenance")
        elif any(word in text for word in ["αρχική", "home", "κύρια", "main"]):
            self.execute_command("home")
        elif any(word in text for word in ["ανανέωση", "refresh", "ενημέρωση", "update"]):
            self.execute_command("refresh")
        elif any(word in text for word in ["βοήθεια", "help", "χρειάζομαι", "need"]):
            self.execute_command("help")
        else:
            print(f"❓ Unknown command: '{text}'")
            self.speak_response("Δεν καταλαβαίνω την εντολή. Παρακαλώ επαναλάβετε.")
            
    def execute_command(self, command):
        """Execute the recognized command"""
        print(f"⚡ Executing command: {command}")
        
        # Log command
        self.command_history.append({
            'command': command,
            'timestamp': datetime.now().isoformat()
        })
        
        # Write command to file for kiosk script to read
        with open('/tmp/voice_command.txt', 'w') as f:
            f.write(command)
            
        # Provide audio feedback
        self.speak_response(f"Εκτελώ εντολή: {command}")
        
    def speak_response(self, text):
        """Convert text to speech"""
        try:
            # Use espeak for Greek text-to-speech
            os.system(f'espeak -v el "{text}" --stdout | aplay -q')
        except Exception as e:
            print(f"❌ Text-to-speech error: {e}")
            
    def start(self):
        """Start the voice recognition service"""
        print("🚀 Starting Voice Kiosk Controller...")
        
        # Calibrate microphone
        self.calibrate_microphone()
        
        # Start listening in a separate thread
        listen_thread = threading.Thread(target=self.listen_for_commands)
        listen_thread.daemon = True
        listen_thread.start()
        
        # Keep main thread alive
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("🛑 Stopping voice recognition...")
            self.is_listening = False

def main():
    """Main function"""
    print("🏢 Building Management Voice Kiosk")
    print("=" * 50)
    
    # Check audio devices
    try:
        import pyaudio
        p = pyaudio.PyAudio()
        print(f"🔊 Available audio devices: {p.get_device_count()}")
        p.terminate()
    except Exception as e:
        print(f"❌ Audio device check failed: {e}")
        
    # Start voice controller
    controller = VoiceKioskController()
    controller.start()

if __name__ == "__main__":
    main()
