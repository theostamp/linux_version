import { useEffect, useCallback, useRef, useState } from 'react';

interface VoiceNavigationOptions {
  onSlideChange: (slideIndex: number) => void;
  onCommand: (command: string) => void;
  totalSlides: number;
  language?: string;
  enabled?: boolean;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

/**
 * Voice Navigation Hook for Kiosk Display
 *
 * Provides voice-controlled navigation using Web Speech API
 * Supports Greek and English voice commands
 */
export function useVoiceNavigation({
  onSlideChange,
  onCommand,
  totalSlides,
  language = 'el-GR',
  enabled = true
}: VoiceNavigationOptions) {
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Voice command mapping (Greek & English)
  const commandMap = useRef<Record<string, { action: string; slideIndex?: number }>>({
    // Greek commands
    'ανακοινώσεις': { action: 'slide', slideIndex: 0 },
    'ψηφοφορίες': { action: 'slide', slideIndex: 1 },
    'ψηφοφορία': { action: 'slide', slideIndex: 1 },
    'οικονομικά': { action: 'slide', slideIndex: 2 },
    'χρηματικά': { action: 'slide', slideIndex: 2 },
    'συντήρηση': { action: 'slide', slideIndex: 3 },
    'επισκευές': { action: 'slide', slideIndex: 3 },
    'αρχική': { action: 'home' },
    'κύρια': { action: 'home' },
    'επόμενο': { action: 'next' },
    'προηγούμενο': { action: 'previous' },
    'πίσω': { action: 'previous' },
    'στοπ': { action: 'stop' },
    'παύση': { action: 'pause' },
    'συνέχεια': { action: 'resume' },
    'βοήθεια': { action: 'help' },

    // English commands
    'announcements': { action: 'slide', slideIndex: 0 },
    'votes': { action: 'slide', slideIndex: 1 },
    'voting': { action: 'slide', slideIndex: 1 },
    'financial': { action: 'slide', slideIndex: 2 },
    'finance': { action: 'slide', slideIndex: 2 },
    'maintenance': { action: 'slide', slideIndex: 3 },
    'repairs': { action: 'slide', slideIndex: 3 },
    'home': { action: 'home' },
    'main': { action: 'home' },
    'next': { action: 'next' },
    'previous': { action: 'previous' },
    'back': { action: 'previous' },
    'stop': { action: 'stop' },
    'pause': { action: 'pause' },
    'resume': { action: 'resume' },
    'continue': { action: 'resume' },
    'help': { action: 'help' }
  });

  // Process recognized speech text
  const processCommand = useCallback((transcript: string) => {
    const text = transcript.toLowerCase().trim();
    console.log('🎤 Voice command:', text);
    setLastCommand(text);

    // Check for exact match
    if (commandMap.current[text]) {
      const command = commandMap.current[text];
      executeCommand(command, text);
      return;
    }

    // Check for partial matches
    for (const [key, command] of Object.entries(commandMap.current)) {
      if (text.includes(key)) {
        executeCommand(command, key);
        return;
      }
    }

    // Number commands (Greek: "ένα", "δύο", "τρία" or "1", "2", "3")
    const greekNumbers: Record<string, number> = {
      'ένα': 0, 'μία': 0, 'πρώτο': 0,
      'δύο': 1, 'δεύτερο': 1,
      'τρία': 2, 'τρίτο': 2,
      'τέσσερα': 3, 'τέταρτο': 3,
      'πέντε': 4, 'πέμπτο': 4
    };

    for (const [word, index] of Object.entries(greekNumbers)) {
      if (text.includes(word) && index < totalSlides) {
        onSlideChange(index);
        onCommand(`slide_${index}`);
        speak(`Μετάβαση σε σλάιντ ${index + 1}`);
        return;
      }
    }

    // Direct number commands
    const numberMatch = text.match(/\d+/);
    if (numberMatch) {
      const slideIndex = parseInt(numberMatch[0]) - 1;
      if (slideIndex >= 0 && slideIndex < totalSlides) {
        onSlideChange(slideIndex);
        onCommand(`slide_${slideIndex}`);
        speak(`Μετάβαση σε σλάιντ ${slideIndex + 1}`);
        return;
      }
    }

    console.log('❓ Unknown command:', text);
    setError('Άγνωστη εντολή');
    speak('Δεν καταλαβαίνω την εντολή');
  }, [onSlideChange, onCommand, totalSlides]);

  // Execute command action
  const executeCommand = useCallback((command: { action: string; slideIndex?: number }, text: string) => {
    setError(null);

    switch (command.action) {
      case 'slide':
        if (command.slideIndex !== undefined && command.slideIndex < totalSlides) {
          onSlideChange(command.slideIndex);
          onCommand(`slide_${command.slideIndex}`);
          speak(`Άνοιγμα ${text}`);
        }
        break;

      case 'home':
        onSlideChange(0);
        onCommand('home');
        speak('Επιστροφή στην αρχική');
        break;

      case 'next':
        onCommand('next');
        speak('Επόμενο');
        break;

      case 'previous':
        onCommand('previous');
        speak('Προηγούμενο');
        break;

      case 'pause':
        onCommand('pause');
        speak('Παύση');
        break;

      case 'resume':
        onCommand('resume');
        speak('Συνέχεια');
        break;

      case 'stop':
        onCommand('stop');
        speak('Διακοπή');
        stopListening();
        break;

      case 'help':
        onCommand('help');
        speak('Διαθέσιμες εντολές: ανακοινώσεις, ψηφοφορίες, οικονομικά, συντήρηση');
        break;

      default:
        console.warn('Unknown action:', command.action);
    }
  }, [onSlideChange, onCommand, totalSlides]);

  // Text-to-speech feedback
  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'el-GR';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (!enabled) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error('Speech Recognition not supported');
      setError('Η φωνητική αναγνώριση δεν υποστηρίζεται');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = language;

    recognition.onstart = () => {
      console.log('🎤 Voice recognition started');
      setIsListening(true);
      setError(null);
    };

    recognition.onend = () => {
      console.log('🎤 Voice recognition ended');
      setIsListening(false);

      // Auto-restart if still enabled
      if (enabled) {
        restartTimeoutRef.current = setTimeout(() => {
          try {
            recognition.start();
          } catch (err) {
            console.error('Failed to restart recognition:', err);
          }
        }, 1000);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('🎤 Voice recognition error:', event.error);

      if (event.error === 'no-speech') {
        // Normal - no error message needed
        return;
      }

      if (event.error === 'aborted') {
        // User stopped or browser aborted - don't show error
        return;
      }

      if (event.error === 'network') {
        setError('Απαιτείται σύνδεση στο διαδίκτυο');
      } else if (event.error === 'not-allowed') {
        setError('Δεν επιτρέπεται η πρόσβαση στο μικρόφωνο');
      } else {
        setError(`Σφάλμα: ${event.error}`);
      }
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.results.length - 1];
      if (result.isFinal) {
        const transcript = result[0].transcript;
        processCommand(transcript);
      }
    };

    recognitionRef.current = recognition;

    // Start recognition
    try {
      recognition.start();
    } catch (err) {
      console.error('Failed to start recognition:', err);
    }

    // Cleanup
    return () => {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      try {
        recognition.stop();
      } catch (err) {
        // Ignore errors during cleanup
      }
    };
  }, [enabled, language, processCommand]);

  // Manual start/stop controls
  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Failed to start listening:', err);
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error('Failed to stop listening:', err);
      }
    }
  }, [isListening]);

  return {
    isListening,
    lastCommand,
    error,
    startListening,
    stopListening,
    speak
  };
}