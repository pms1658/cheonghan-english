import { useState, useRef, useEffect, useCallback } from 'react';

interface TTSOptions {
    lang?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
}

export const useTTS = () => {
    const [isSupported, setIsSupported] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const synth = useRef<SpeechSynthesis | null>(null);
    const voices = useRef<SpeechSynthesisVoice[]>([]);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            setIsSupported(true);
            synth.current = window.speechSynthesis;

            const loadVoices = () => {
                voices.current = synth.current?.getVoices() || [];
            };

            loadVoices();
            if (speechSynthesis.onvoiceschanged !== undefined) {
                speechSynthesis.onvoiceschanged = loadVoices;
            }
        }
    }, []);

    const speak = useCallback((text: string, options: TTSOptions = {}) => {
        if (!synth.current) return;

        // Cancel current speak
        synth.current.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = options.lang || 'en-US'; // Default to US English
        utterance.rate = options.rate || 0.9; // Slightly slower for clarity
        utterance.pitch = options.pitch || 1;
        utterance.volume = options.volume || 1;

        // Try to pick a better voice (Google US English or similar)
        if (voices.current.length > 0) {
            const preferredVoice = voices.current.find(v =>
                v.lang === 'en-US' && (v.name.includes('Google') || v.name.includes('Samantha'))
            );
            if (preferredVoice) utterance.voice = preferredVoice;
        }

        utterance.onstart = () => setIsPlaying(true);
        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => setIsPlaying(false);

        synth.current.speak(utterance);
    }, []);

    const cancel = useCallback(() => {
        if (synth.current) {
            synth.current.cancel();
            setIsPlaying(false);
        }
    }, []);

    return { speak, cancel, isSupported, isPlaying };
};
