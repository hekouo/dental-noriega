"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type VoiceSearchCallbacks = {
  onResult?: (transcript: string) => void;
  onError?: (error: string) => void;
};

type SpeechRecognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEvent = {
  results: SpeechRecognitionResultList;
  resultIndex: number;
};

type SpeechRecognitionErrorEvent = {
  error: string;
  message?: string;
};

type SpeechRecognitionResultList = {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
};

type SpeechRecognitionResult = {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
};

type SpeechRecognitionAlternative = {
  transcript: string;
  confidence: number;
};

/**
 * Hook para búsqueda por voz usando Web Speech API
 * Solo funciona si el navegador soporta SpeechRecognition
 * y el feature flag está activado
 */
export function useVoiceSearch(callbacks: VoiceSearchCallbacks = {}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Verificar soporte al montar
  useEffect(() => {
    if (typeof window === "undefined") return;

    const flagEnabled = process.env.NEXT_PUBLIC_ENABLE_VOICE_SEARCH === "true";
    if (!flagEnabled) {
      setSupported(false);
      return;
    }

    // Verificar si existe SpeechRecognition (Chrome/Edge) o webkitSpeechRecognition (Safari)
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognition })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognition })
        .webkitSpeechRecognition;

    if (SpeechRecognition) {
      setSupported(true);
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = "es-MX";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.continuous = false;

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = event.results[event.resultIndex]?.[0]?.transcript?.trim();
          if (transcript && callbacks.onResult) {
            callbacks.onResult(transcript);
          }
          setListening(false);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          setListening(false);
          if (callbacks.onError) {
            const errorCode = event.error || "unknown";
            callbacks.onError(errorCode);
          }
        };

        recognition.onend = () => {
          setListening(false);
        };

        recognitionRef.current = recognition;
      } catch (error) {
        console.warn("[useVoiceSearch] Error initializing SpeechRecognition:", error);
        setSupported(false);
      }
    } else {
      setSupported(false);
    }

    // Cleanup
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
          recognitionRef.current.abort();
        } catch {
          // Ignorar errores al limpiar
        }
        recognitionRef.current = null;
      }
    };
  }, [callbacks.onResult, callbacks.onError]);

  const start = useCallback(() => {
    if (!supported || !recognitionRef.current || listening) return;

    try {
      setListening(true);
      recognitionRef.current.start();
    } catch (error) {
      console.warn("[useVoiceSearch] Error starting recognition:", error);
      setListening(false);
      if (callbacks.onError) {
        callbacks.onError("start-failed");
      }
    }
  }, [supported, listening, callbacks]);

  const stop = useCallback(() => {
    if (!recognitionRef.current || !listening) return;

    try {
      recognitionRef.current.stop();
      setListening(false);
    } catch (error) {
      console.warn("[useVoiceSearch] Error stopping recognition:", error);
      setListening(false);
    }
  }, [listening]);

  return {
    supported,
    listening,
    start,
    stop,
  };
}
