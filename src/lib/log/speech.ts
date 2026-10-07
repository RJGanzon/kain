'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** The bits of the Web Speech API Kain uses. */
interface Recognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type SpeechStatus = 'idle' | 'listening' | 'unsupported';

/**
 * Speak a purchase: Filipino first (fil-PH), English (en-PH) if the phone
 * doesn't have Filipino. Typing always works.
 */
export function useSpeech(onText: (text: string) => void) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const onTextRef = useRef(onText);
  useEffect(() => {
    onTextRef.current = onText;
  });

  useEffect(() => {
    setSupported(recognitionCtor() !== null);
    return () => rec.current?.abort();
  }, []);

  const listen = useCallback((lang: 'fil-PH' | 'en-PH' = 'fil-PH') => {
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    setProblem(null);
    const r = new Ctor();
    r.lang = lang;
    r.interimResults = true;
    r.maxAlternatives = 1;
    r.continuous = false;
    r.onresult = (e) => {
      const text = Array.from(e.results)
        .map((res) => res[0]?.transcript ?? '')
        .join(' ')
        .trim();
      if (text) onTextRef.current(text);
    };
    r.onerror = (e) => {
      if (e.error === 'language-not-supported' && lang === 'fil-PH') {
        rec.current = null;
        listen('en-PH');
        return;
      }
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') setProblem('Allow the microphone to log by voice. Typing works too.');
      else if (e.error !== 'aborted' && e.error !== 'no-speech') setProblem("Voice isn't available right now. Type it instead.");
    };
    r.onend = () => {
      if (rec.current === r) {
        rec.current = null;
        setListening(false);
      }
    };
    rec.current = r;
    setListening(true);
    try {
      r.start();
    } catch {
      rec.current = null;
      setListening(false);
      setProblem("Voice isn't available right now. Type it instead.");
    }
  }, []);

  const toggle = useCallback(() => {
    if (rec.current) {
      rec.current.stop();
      return;
    }
    listen();
  }, [listen]);

  return { supported, listening, problem, toggle };
}
