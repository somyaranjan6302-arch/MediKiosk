// Voice Service: Multilingual STT (Speech-to-Text) & TTS (Text-to-Speech)
// Integrated for low-literacy elderly patients (Hindi + English)

export class VoiceService {
  private static recognition: any = null;
  private static isListening: boolean = false;
  private static speechRate: number = 0.9; // slightly slower for clinical clarity

  public static setRate(rate: number) {
    this.speechRate = rate;
  }

  public static speak(text: string, language: string = 'hi', onEnd?: () => void) {
    if (!('speechSynthesis' in window)) {
      console.warn('Text-to-speech not supported in this browser.');
      if (onEnd) onEnd();
      return;
    }

    window.speechSynthesis.cancel(); // cancel prior speech

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = this.speechRate;
    utterance.pitch = 1.0;

    // Pick appropriate voice
    const voices = window.speechSynthesis.getVoices();
    const langCode = language === 'hi' ? 'hi-IN' : 'en-IN';
    const voice = voices.find(v => v.lang.includes(langCode) || v.lang.includes(language));
    if (voice) {
      utterance.voice = voice;
    }
    utterance.lang = langCode;

    if (onEnd) {
      utterance.onend = onEnd;
      utterance.onerror = onEnd;
    }

    window.speechSynthesis.speak(utterance);
  }

  public static stopSpeaking() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  public static startListening(
    language: string = 'hi',
    onResult: (transcript: string) => void,
    onError: (err: string) => void,
    onEnd?: () => void
  ) {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      onError('Microphone voice recognition is not supported in this browser. Please use keyboard/touch.');
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';

      this.recognition.onstart = () => {
        this.isListening = true;
      };

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onResult(transcript);
      };

      this.recognition.onerror = (event: any) => {
        this.isListening = false;
        onError(event.error || 'Speech input error');
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (onEnd) onEnd();
      };

      this.recognition.start();
    } catch (e: any) {
      onError(e.message || 'Microphone activation failed');
    }
  }

  public static stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }
}
