/**
 * 듣기세트 전용 TTS 엔진
 * 
 * 실제 수능 듣기평가 완전 시뮬레이션:
 * 1. 오프닝 "청한영어 모의고사 듣기세트입니다. 문제지를 넘기시기 바랍니다."
 * 2. 3초 대기 → 문제 보임
 * 3. "그러면 지금부터 영어 영역 듣기 평가를 시작하겠습니다"
 * 4. 1~15번 듣기 (한 번 재생, 문제 간 적절한 간격) + 딩동
 * 5. "이제 16번과 17번입니다. 두 번 들려줍니다"
 * 6. 16~17번 (두 번 재생) + 딩동
 * 7. "이상으로 듣기 평가를 마칩니다" → 60초 전환 → 독해 시간
 * 
 * ★ 핵심 설계 원칙: 절대 크래시하지 않는다.
 *   모든 오디오 작업은 try-catch로 감싸고, 실패 시 silent delay로 대체.
 *   테스트는 어떤 상황에서도 끝까지 진행된다.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import type { ListeningProblem, ScriptLine } from '@/types';
import {
    OPENING_SCRIPT,
    PAGE_TURN_DELAY_SECONDS,
    LISTENING_START_SCRIPT,
    LONG_SET_INTRO_SCRIPT,
    REPLAY_INTRO_SCRIPT,
    TRANSITION_SCRIPT,
    TRANSITION_DELAY_SECONDS,
} from '@/services/listeningPrompts';

export type ListeningPhase = 
    | 'idle'           // 시작 전
    | 'preparing'      // TTS 사전 다운로드 중
    | 'ready'          // 다운로드 완료 — 학생이 “테스트 시작” 버튼 누를 때까지 대기
    | 'opening'        // 오프닝 안내방송
    | 'page_turn'      // “문제지를 넘기시기 바랍니다” 3초 대기 — 문제 보이기 시작
    | 'playing'        // 듣기 대본 재생 중
    | 'gap'            // 문제 간 대기
    | 'replay'         // 16~17번 두번째 재생 중
    | 'transition'     // 듣기 종료 → 독해 전환
    | 'reading_time'   // 독해 풀이 시간
    | 'done';          // 전체 완료

interface UseListeningTTSOptions {
    problems: ListeningProblem[];
    onPageTurn?: () => void;
    onProblemStart?: (index: number) => void;
    onProblemEnd?: (index: number) => void;
    onTransitionStart?: () => void;
    onAllComplete?: () => void;
}

interface UseListeningTTSReturn {
    phase: ListeningPhase;
    currentProblemIndex: number;
    currentLineIndex: number;
    elapsedSeconds: number;
    gapRemaining: number;
    transitionRemaining: number;
    isSecondPlay: boolean;
    canViewReading: boolean;
    preparingProgress: { current: number; total: number };
    prepareAudio: () => void;   // ★ 1단계: 다운로드만
    beginExam: () => void;      // ★ 2단계: 시험 시작
    stopListening: () => void;
}

// ══════════════════════════════════════
// 한자어 숫자 변환 (TTS가 "일번" "십육번"으로 정확히 읽도록)
// ══════════════════════════════════════
const SINO_KOREAN: Record<number, string> = {
    0: '영', 1: '일', 2: '이', 3: '삼', 4: '사', 5: '오',
    6: '육', 7: '칠', 8: '팔', 9: '구', 10: '십',
    11: '십일', 12: '십이', 13: '십삼', 14: '십사', 15: '십오',
    16: '십육', 17: '십칠', 18: '십팔', 19: '십구', 20: '이십',
    25: '이십오', 26: '이십육', 27: '이십칠', 28: '이십팔',
    43: '사십삼', 44: '사십사', 45: '사십오',
};

function toSinoKorean(n: number): string {
    if (SINO_KOREAN[n]) return SINO_KOREAN[n];
    if (n < 100) {
        const tens = Math.floor(n / 10);
        const ones = n % 10;
        const tensStr = tens === 1 ? '십' : (SINO_KOREAN[tens] || tens) + '십';
        const onesStr = ones === 0 ? '' : (SINO_KOREAN[ones] || ones);
        return tensStr + onesStr;
    }
    return String(n);
}

/** Replace "1번", "16번" etc. in Korean text with "일번", "십육번" */
function convertNumbersInKorean(text: string): string {
    return text.replace(/(\d+)번/g, (_, numStr) => {
        const n = parseInt(numStr, 10);
        return toSinoKorean(n) + '번';
    }).replace(/(\d+)교시/g, (_, numStr) => {
        const n = parseInt(numStr, 10);
        return toSinoKorean(n) + '교시';
    });
}

// ══════════════════════════════════════
// 수능 딩동 차임벨 (Web Audio API)
// 실제 수능: 높은 음 → 낮은 음, 까랑까랑한 벨 소리
// E6(1318Hz) → A5(880Hz) + 2배음 오버레이
// ══════════════════════════════════════
function playChime(sharedCtx?: AudioContext | null): Promise<void> {
    return new Promise((resolve) => {
        try {
            const ctx = sharedCtx || new (window.AudioContext || (window as any).webkitAudioContext)();
            const shouldClose = !sharedCtx;
            const now = ctx.currentTime;

            if (ctx.state === 'suspended') {
                ctx.resume().catch(() => {});
            }

            // ── Note 1: E6 (1318Hz) — 높은 음 (첫 타) ──
            // 기본음 (triangle = 까랑까랑한 음색)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.frequency.value = 1318.51; // E6
            osc1.type = 'triangle';
            gain1.gain.setValueAtTime(0.3, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.6);

            // 2배음 오버레이 (밝은 벨 느낌)
            const osc1h = ctx.createOscillator();
            const gain1h = ctx.createGain();
            osc1h.frequency.value = 1318.51 * 2; // 2nd harmonic
            osc1h.type = 'sine';
            gain1h.gain.setValueAtTime(0.08, now);
            gain1h.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc1h.connect(gain1h);
            gain1h.connect(ctx.destination);
            osc1h.start(now);
            osc1h.stop(now + 0.35);

            // ── Note 2: A5 (880Hz) — 낮은 음 (두번째 타, 살짝 딜레이) ──
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.frequency.value = 880.00; // A5
            osc2.type = 'triangle';
            gain2.gain.setValueAtTime(0.28, now + 0.18);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + 0.18);
            osc2.stop(now + 0.9);

            // 2배음
            const osc2h = ctx.createOscillator();
            const gain2h = ctx.createGain();
            osc2h.frequency.value = 880.00 * 2;
            osc2h.type = 'sine';
            gain2h.gain.setValueAtTime(0.06, now + 0.18);
            gain2h.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
            osc2h.connect(gain2h);
            gain2h.connect(ctx.destination);
            osc2h.start(now + 0.18);
            osc2h.stop(now + 0.55);

            setTimeout(() => {
                if (shouldClose) {
                    try { ctx.close(); } catch {}
                }
                resolve();
            }, 1000);
        } catch {
            // 차임 실패해도 진행
            resolve();
        }
    });
}

// ── Safe delay helper ──
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function useListeningTTS({
    problems,
    onPageTurn,
    onProblemStart,
    onProblemEnd,
    onTransitionStart,
    onAllComplete,
}: UseListeningTTSOptions): UseListeningTTSReturn {
    const [phase, setPhase] = useState<ListeningPhase>('idle');
    const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
    const [currentLineIndex, setCurrentLineIndex] = useState(0);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [gapRemaining, setGapRemaining] = useState(0);
    const [transitionRemaining, setTransitionRemaining] = useState(0);
    const [isSecondPlay, setIsSecondPlay] = useState(false);
    const [canViewReading, setCanViewReading] = useState(false);
    const [preparingProgress, setPreparingProgress] = useState({ current: 0, total: 0 });

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const gapTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const abortedRef = useRef(false);

    // ── Cleanup ──
    useEffect(() => {
        return () => {
            abortedRef.current = true;
            if (timerRef.current) clearInterval(timerRef.current);
            if (gapTimerRef.current) clearInterval(gapTimerRef.current);
            try { currentSourceRef.current?.stop(); } catch {}
            if (audioCtxRef.current) {
                audioCtxRef.current.close().catch(() => {});
                audioCtxRef.current = null;
            }
        };
    }, []);

    // ── Stop Listening (수동 중지) ──
    const stopListening = useCallback(() => {
        abortedRef.current = true;
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        if (gapTimerRef.current) { clearInterval(gapTimerRef.current); gapTimerRef.current = null; }
        try { currentSourceRef.current?.stop(); } catch {}
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        setPhase('done');
        setCanViewReading(true);
    }, []);

    // ── Elapsed Timer ──
    useEffect(() => {
        if (phase === 'idle' || phase === 'done') return;
        timerRef.current = setInterval(() => {
            setElapsedSeconds(s => s + 1);
        }, 1000);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [phase]);

    // ── Audio cache (base64) ──
    const audioCacheRef = useRef<Map<string, string>>(new Map());

    // ── Decoded AudioBuffer cache ──
    const audioBufferCacheRef = useRef<Map<string, AudioBuffer>>(new Map());

    // ── Persistent AudioContext (created on user gesture in startListening) ──
    const audioCtxRef = useRef<AudioContext | null>(null);
    const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

    // ── Convert base64 to ArrayBuffer ──
    const base64ToArrayBuffer = useCallback((base64: string): ArrayBuffer => {
        const binary = atob(base64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }, []);

    // ── Pre-cached problem WAV buffers (problem number → AudioBuffer) ──
    const problemAudioCacheRef = useRef<Map<number, AudioBuffer>>(new Map());

    // ── Prefetch a single problem's combined WAV audio ──
    const prefetchProblemAudio = useCallback(async (problem: ListeningProblem): Promise<boolean> => {
        try {
            if (problemAudioCacheRef.current.has(problem.number)) return true;
            if (!problem.script || problem.script.length === 0) return false;

            // If pre-cached URL exists, use that
            if (problem.audioUrl) {
                const ctx = audioCtxRef.current;
                if (!ctx) return false;
                const res = await fetch(problem.audioUrl);
                if (res.ok) {
                    const buf = await res.arrayBuffer();
                    const decoded = await ctx.decodeAudioData(buf);
                    problemAudioCacheRef.current.set(problem.number, decoded);
                    return true;
                }
            }

            // Generate via tts-problem API
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 120000);

            const res = await fetch('/api/tts-problem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lines: problem.script,
                    problemNumber: problem.number,
                }),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (!res.ok) return false;

            const data = await res.json();
            if (!data.audioContent) return false;

            const ctx = audioCtxRef.current;
            if (!ctx) return false;

            const arrayBuffer = base64ToArrayBuffer(data.audioContent);
            const decoded = await ctx.decodeAudioData(arrayBuffer);
            problemAudioCacheRef.current.set(problem.number, decoded);
            return true;
        } catch (err: any) {
            console.warn(`[TTS] Prefetch failed for problem ${problem.number}:`, err.message);
            return false;
        }
    }, [base64ToArrayBuffer]);

    // ── Play audio buffer via AudioContext (same method as chime — works on iOS!) ──
    const playAudioBuffer = useCallback((buffer: AudioBuffer): Promise<void> => {
        return new Promise(async (resolve) => {
            try {
                const ctx = audioCtxRef.current;
                if (!ctx || abortedRef.current) { resolve(); return; }

                // ★ 모바일 핵심: 매 재생 전 반드시 resume (iOS에서 context가 suspended 되면 소리 안 남)
                if (ctx.state === 'suspended' || ctx.state === 'interrupted' as any) {
                    try { await ctx.resume(); } catch {}
                }

                // Stop any currently playing source
                if (currentSourceRef.current) {
                    try { currentSourceRef.current.stop(); } catch {}
                    currentSourceRef.current = null;
                }

                const source = ctx.createBufferSource();
                source.buffer = buffer;
                source.connect(ctx.destination);
                currentSourceRef.current = source;

                // Safety timeout (prevent infinite hang)
                const timeout = setTimeout(() => {
                    try { source.stop(); } catch {}
                    currentSourceRef.current = null;
                    resolve();
                }, Math.max(30000, (buffer.duration + 5) * 1000));

                source.onended = () => {
                    clearTimeout(timeout);
                    currentSourceRef.current = null;
                    resolve();
                };

                source.start(0);
            } catch (err) {
                console.warn('[TTS] playAudioBuffer error:', err);
                resolve();
            }
        });
    }, []);

    // ── Stage direction detection helpers ──
    const isStagDirectionOnly = (text: string): boolean => /^\[.+\]\s*$/.test(text.trim());
    const stripStageDirections = (text: string): string =>
        text
            .replace(/\[Pause\]/gi, ' ')
            .replace(/\[Cell phone rings\.?\]/gi, ' ')
            .replace(/\[Telephone rings\.?\]/gi, ' ')
            .replace(/\[Tapping sound\]/gi, ' ')
            .replace(/\[Typing sounds?\]/gi, ' ')
            .replace(/\[Mouse clicking sound\]/gi, ' ')
            .replace(/\[Knocking( sound)?\]/gi, ' ')
            .replace(/\[Doorbell( rings)?\.?\]/gi, ' ')
            .replace(/\[\w[^\]]*\]/g, ' ')
            .replace(/\s{2,}/g, ' ')
            .trim();

    // ── Speak a single line via Cloud TTS ──
    const speakLine = useCallback((line: { speaker: 'M' | 'W' | 'N'; text: string; lang?: string }): Promise<void> => {
        return new Promise(async (resolve) => {
            if (abortedRef.current) { resolve(); return; }

            // ★ 무대지시 필터링: [Pause], [Cell phone rings.] 등
            if (isStagDirectionOnly(line.text)) {
                // 전체가 무대지시 → 침묵으로 대체
                const silenceMs = line.text.toLowerCase().includes('pause') ? 1500
                    : line.text.toLowerCase().includes('rings') ? 2000 : 1500;
                await delay(silenceMs);
                resolve();
                return;
            }

            let textToSpeak = stripStageDirections(line.text);
            if (!textToSpeak.trim()) {
                await delay(500);
                resolve();
                return;
            }

            if (line.lang === 'ko' || line.speaker === 'N') {
                textToSpeak = convertNumbersInKorean(textToSpeak);
            }

            const cacheKey = `${line.speaker}_${line.lang || 'en'}_${textToSpeak}`;

            // Safety timeout: force resolve after 25s no matter what
            const safetyTimeout = setTimeout(() => {
                console.warn('[TTS] Safety timeout for line');
                try { currentSourceRef.current?.stop(); } catch {}
                resolve();
            }, 25000);

            const safeResolve = () => {
                clearTimeout(safetyTimeout);
                resolve();
            };

            const ctx = audioCtxRef.current;

            // ── Try Cloud TTS → AudioContext playback ──
            if (ctx) {
                try {
                    if (ctx.state === 'suspended') {
                        await ctx.resume();
                    }

                    // Check decoded buffer cache first
                    let audioBuffer = audioBufferCacheRef.current.get(cacheKey);

                    if (!audioBuffer) {
                        // Get base64 from cache or fetch
                        let audioBase64 = audioCacheRef.current.get(cacheKey);

                        if (!audioBase64) {
                            const controller = new AbortController();
                            const fetchTimeout = setTimeout(() => controller.abort(), 20000);

                            const res = await fetch('/api/tts', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    text: textToSpeak,
                                    speaker: line.speaker,
                                    lang: line.lang || (line.speaker === 'N' ? 'ko' : 'en'),
                                }),
                                signal: controller.signal,
                            });
                            clearTimeout(fetchTimeout);

                            if (!res.ok) throw new Error(`TTS API ${res.status}`);

                            const data = await res.json();
                            audioBase64 = data.audioContent;
                            if (audioBase64) {
                                audioCacheRef.current.set(cacheKey, audioBase64);
                            }
                        }

                        if (audioBase64) {
                            const arrayBuffer = base64ToArrayBuffer(audioBase64);
                            audioBuffer = await ctx.decodeAudioData(arrayBuffer);
                            audioBufferCacheRef.current.set(cacheKey, audioBuffer);
                        }
                    }

                    if (audioBuffer) {
                        await playAudioBuffer(audioBuffer);
                        safeResolve();
                        return;
                    }
                } catch (err: any) {
                    console.warn('[TTS] AudioContext playback failed:', err.message || err);
                }
            }

            // ── Ultimate Fallback: Web Speech API (남녀 음성 구분) ──
            console.warn(`[TTS] ⚠️ Cloud TTS 실패 → Web Speech API 폴백 사용 중! (speaker: ${line.speaker})`);
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel(); // Prevent overlap
                const utterance = new SpeechSynthesisUtterance(textToSpeak);
                const isKorean = line.lang === 'ko' || line.speaker === 'N';
                utterance.lang = isKorean ? 'ko-KR' : 'en-US';
                utterance.rate = 0.9;

                // ★ 남녀 음성 명시 선택 — 브라우저 음성 목록에서 성별 구분
                try {
                    const voices = window.speechSynthesis.getVoices();
                    const targetLang = isKorean ? 'ko' : 'en';
                    const langVoices = voices.filter(v => v.lang.startsWith(targetLang));

                    if (langVoices.length > 0 && !isKorean) {
                        // 남성: David, Daniel, Mark, James, Google UK English Male 등
                        // 여성: Samantha, Karen, Google UK English Female 등
                        const maleNames = ['David', 'Daniel', 'Mark', 'James', 'Male', 'Google UK English Male'];
                        const femaleNames = ['Samantha', 'Karen', 'Zira', 'Female', 'Google UK English Female'];

                        if (line.speaker === 'M') {
                            const maleVoice = langVoices.find(v =>
                                maleNames.some(n => v.name.includes(n))
                            );
                            if (maleVoice) {
                                utterance.voice = maleVoice;
                                console.log(`[TTS] Web Speech: 남성 음성 선택 → ${maleVoice.name}`);
                            }
                        } else if (line.speaker === 'W') {
                            const femaleVoice = langVoices.find(v =>
                                femaleNames.some(n => v.name.includes(n))
                            );
                            if (femaleVoice) {
                                utterance.voice = femaleVoice;
                                console.log(`[TTS] Web Speech: 여성 음성 선택 → ${femaleVoice.name}`);
                            }
                        }
                    }
                } catch (voiceErr) {
                    console.warn('[TTS] Voice selection failed:', voiceErr);
                }

                // Chrome bug workaround: Chrome fires onend prematurely after ~15s.
                // Periodically pause/resume to keep the speech alive.
                let keepAlive: ReturnType<typeof setInterval> | null = null;
                const startKeepAlive = () => {
                    keepAlive = setInterval(() => {
                        if (window.speechSynthesis.speaking) {
                            window.speechSynthesis.pause();
                            window.speechSynthesis.resume();
                        }
                    }, 10000);
                };
                const stopKeepAlive = () => {
                    if (keepAlive) { clearInterval(keepAlive); keepAlive = null; }
                };

                utterance.onstart = startKeepAlive;
                utterance.onend = () => { stopKeepAlive(); safeResolve(); };
                utterance.onerror = () => { stopKeepAlive(); safeResolve(); };
                window.speechSynthesis.speak(utterance);
            } else {
                const fallbackMs = Math.max(2000, textToSpeak.length * 100);
                setTimeout(safeResolve, fallbackMs);
            }
        });
    }, [base64ToArrayBuffer, playAudioBuffer]);

    // ── Speak an array of lines (더 자연스러운 간격) ──
    const speakLines = useCallback(async (lines: { speaker: 'M' | 'W' | 'N'; text: string; lang?: string }[]) => {
        for (let i = 0; i < lines.length; i++) {
            if (abortedRef.current) return;
            try {
                await speakLine(lines[i]);
            } catch (err) {
                console.warn('[TTS] speakLine error in speakLines:', err);
            }
            // 짧은 간격 — 딩동 사이만 길면 됨
            const nextSpeaker = lines[i + 1]?.speaker;
            const pauseMs = nextSpeaker && nextSpeaker !== lines[i].speaker ? 300 : 200;
            await delay(pauseMs);
        }
    }, [speakLine]);

    // ── Wait helper ──
    const wait = useCallback((seconds: number, updateFn?: (remaining: number) => void): Promise<void> => {
        return new Promise((resolve) => {
            if (seconds <= 0) { resolve(); return; }
            let remaining = Math.ceil(seconds);
            if (updateFn) updateFn(remaining);

            const interval = setInterval(() => {
                remaining--;
                if (updateFn) updateFn(Math.max(0, remaining));
                if (remaining <= 0) {
                    clearInterval(interval);
                    resolve();
                }
            }, 1000);

            gapTimerRef.current = interval;
        });
    }, []);

    // ── Play all script lines for a problem ──
    const playProblemScript = useCallback(async (problem: ListeningProblem) => {
        const script = problem.script;
        if (!script || script.length === 0) return;

        console.log(`[TTS] ▶ Playing problem #${problem.number} | hasAudioUrl: ${!!problem.audioUrl} | inMemoryCache: ${problemAudioCacheRef.current.has(problem.number)}`);

        // ── 1) Check problem-level WAV cache first (from prefetch) ──
        const problemBuffer = problemAudioCacheRef.current.get(problem.number);
        if (problemBuffer) {
            try {
                const ctx = audioCtxRef.current;
                if (ctx) {
                    if (ctx.state === 'suspended') await ctx.resume();
                    console.log(`[TTS] ✅ #${problem.number}: Playing from in-memory cache (${problemBuffer.duration.toFixed(1)}s)`);
                    setCurrentLineIndex(0);
                    await playAudioBuffer(problemBuffer);
                    return;
                }
            } catch (err: any) {
                console.warn(`[TTS] ❌ #${problem.number}: In-memory cache playback failed:`, err.message);
            }
        }

        // ── 2) Pre-cached audio URL ──
        if (problem.audioUrl) {
            try {
                const ctx = audioCtxRef.current;
                if (ctx) {
                    if (ctx.state === 'suspended') await ctx.resume();
                    const cacheKey = `precache_${problem.number}`;
                    let audioBuffer = audioBufferCacheRef.current.get(cacheKey);
                    if (!audioBuffer) {
                        console.log(`[TTS] #${problem.number}: Fetching audioUrl from Firebase...`);
                        const response = await fetch(problem.audioUrl);
                        console.log(`[TTS] #${problem.number}: Firebase response: ${response.status} ${response.statusText}, size: ${response.headers.get('content-length') || '?'} bytes`);
                        if (response.ok) {
                            const arrayBuffer = await response.arrayBuffer();
                            console.log(`[TTS] #${problem.number}: ArrayBuffer size: ${arrayBuffer.byteLength} bytes`);
                            audioBuffer = await ctx.decodeAudioData(arrayBuffer);
                            audioBufferCacheRef.current.set(cacheKey, audioBuffer);
                        } else {
                            console.warn(`[TTS] ❌ #${problem.number}: Firebase fetch failed: ${response.status}`);
                        }
                    }
                    if (audioBuffer && !abortedRef.current) {
                        setCurrentLineIndex(0);
                        await playAudioBuffer(audioBuffer);
                        return;
                    }
                }
            } catch (err: any) {
                console.warn('[TTS] Pre-cached playback failed, falling back:', err.message);
            }
        }

        // ── 3) Fallback: line-by-line TTS generation ──
        console.warn(`[TTS] ⚠ #${problem.number}: Using line-by-line fallback (no cached audio available)`);
        for (let i = 0; i < script.length; i++) {
            if (abortedRef.current) return;
            setCurrentLineIndex(i);
            if (i > 0 && script[i].speaker !== script[i - 1].speaker) {
                await delay(250);
            }
            try {
                await speakLine(script[i]);
            } catch (err) {
                console.warn('[TTS] Line playback failed:', err);
                // Silent delay fallback for this line
                await delay(Math.max(2000, (script[i].text?.length || 20) * 100));
            }
            await delay(150);
        }
    }, [speakLine, playAudioBuffer]);

    // ══════════════════════════════════════════════
    // Main Playback Sequence — 실제 수능 시험 흐름
    // ★ 이 함수는 절대 throw하지 않는다!
    // ══════════════════════════════════════════════
    // ★ 1단계: 오디오 다운로드만 (학생이 “준비완료” 누름)
    const prepareAudio = useCallback(async () => {
        if (phase !== 'idle' || !problems || problems.length === 0) return;

        abortedRef.current = false;

        // ── AudioContext 초기화 (iOS unlock) ──
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioCtxRef.current = ctx;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            gain.gain.value = 0;
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(0);
            osc.stop(ctx.currentTime + 0.001);
            if (ctx.state === 'suspended') await ctx.resume();
            console.log('[TTS] AudioContext created & unlocked, state:', ctx.state);
        } catch (e) {
            console.warn('[TTS] AudioContext creation failed:', e);
        }

        // ── 오디오 다운로드 ──
        try {
            const problemsWithAudio = problems.filter(p => p.audioUrl);
            if (problemsWithAudio.length > 0) {
                setPhase('preparing');
                setPreparingProgress({ current: 0, total: problemsWithAudio.length });
                console.log(`[TTS] ★ Preparing: ${problemsWithAudio.length} problems prefetching...`);

                for (let i = 0; i < problemsWithAudio.length; i++) {
                    if (abortedRef.current) break;
                    const p = problemsWithAudio[i];
                    setPreparingProgress({ current: i + 1, total: problemsWithAudio.length });
                    try {
                        await prefetchProblemAudio(p);
                    } catch (err: any) {
                        console.warn(`[TTS] Prefetch #${p.number} error:`, err.message);
                    }
                }

                const cachedCount = problemsWithAudio.filter(p => problemAudioCacheRef.current.has(p.number)).length;
                console.log(`[TTS] ★ Preparing done: ${cachedCount}/${problemsWithAudio.length} cached`);
            }
        } catch (prepErr) {
            console.warn('[TTS] Preparing phase error (non-fatal):', prepErr);
        }

        // ★ ready 상태로 전환 — 학생이 “테스트 시작” 버튼 누를 때까지 대기
        setPhase('ready');
    }, [phase, problems, prefetchProblemAudio]);

    // ★ 2단계: 시험 시작 (학생이 “테스트 시작” 누름)
    const beginExam = useCallback(async () => {
        if (phase !== 'ready') return;

        setElapsedSeconds(0);
        abortedRef.current = false;

        try {
            // ─── 1. 오프닝 안내방송 ───
            setPhase('opening');
            await speakLines(OPENING_SCRIPT);

            // ─── 2. "문제지 표지를 넘기시기 바랍니다" → 3초 대기 ───
            setPhase('page_turn');
            setCanViewReading(true);
            onPageTurn?.();
            await wait(PAGE_TURN_DELAY_SECONDS, (r) => setGapRemaining(r));

            // ─── 3. "그러면 지금부터 듣기 평가를 시작하겠습니다" ───
            await speakLines(LISTENING_START_SCRIPT);

            // ─── 4. 1~17번 문제 재생 ───
            for (let idx = 0; idx < problems.length; idx++) {
                if (abortedRef.current) break;

                const problem = problems[idx];
                setCurrentProblemIndex(idx);
                setCurrentLineIndex(0);
                setIsSecondPlay(false);

                // ★ 16~17번 특별 처리: 실제 수능 플로우
                if (problem.number === 16) {
                    // 1. 안내: "16번과 17번은 두 번 들려줍니다. 잘 듣고 물음에 답하시기 바랍니다."
                    try {
                        await speakLines(LONG_SET_INTRO_SCRIPT);
                        await delay(500);
                    } catch (e) {
                        console.warn('[TTS] Long set intro failed:', e);
                    }

                    onProblemStart?.(idx);

                    // 2. 딩동 → 대본 1회차 재생 → 딩동
                    try { await playChime(audioCtxRef.current); } catch {}
                    await delay(300);
                    setPhase('playing');
                    try {
                        await playProblemScript(problem);
                    } catch (err) {
                        console.warn(`[TTS] Problem 16 playback failed:`, err);
                        const totalChars = (problem.script || []).reduce((sum, line) => sum + (line.text?.length || 0), 0);
                        await delay(Math.max(5000, totalChars * 80));
                    }
                    try { await playChime(audioCtxRef.current); } catch {}

                    // 3. "다시 한번 들려드립니다"
                    await delay(500);
                    try {
                        await speakLines(REPLAY_INTRO_SCRIPT);
                    } catch (e) {
                        console.warn('[TTS] Replay intro failed:', e);
                    }
                    await delay(500);

                    // 4. 딩동 → 대본 2회차 재생 → 딩동
                    try { await playChime(audioCtxRef.current); } catch {}
                    await delay(300);
                    setPhase('replay');
                    setIsSecondPlay(true);
                    setCurrentLineIndex(0);
                    try {
                        await playProblemScript(problem);
                    } catch (err) {
                        console.warn(`[TTS] Problem 16 replay failed:`, err);
                        const totalChars = (problem.script || []).reduce((sum, line) => sum + (line.text?.length || 0), 0);
                        await delay(Math.max(5000, totalChars * 80));
                    }
                    try { await playChime(audioCtxRef.current); } catch {}
                    setIsSecondPlay(false);

                    // 5. 10초 대기
                    setPhase('gap');
                    await wait(10, (r) => setGapRemaining(r));

                    // 6. N: "16번. [instruction]" → 10초 대기
                    const prob16Instruction = problem.script?.find(l => l.speaker === 'N' && l.text?.includes('16번'));
                    if (prob16Instruction) {
                        await speakLines([{ speaker: 'N', text: prob16Instruction.text, lang: 'ko' }]);
                    }
                    setPhase('gap');
                    await wait(10, (r) => setGapRemaining(r));

                    // 7. N: "17번. [instruction]" → 10초 대기
                    const prob17 = problems.find(p => p.number === 17);
                    if (prob17) {
                        const prob17Instruction = prob17.instruction || '언급된 내용과 일치하지 않는 것을 고르시오.';
                        await speakLines([{ speaker: 'N', text: `17번. ${prob17Instruction}`, lang: 'ko' }]);
                        setPhase('gap');
                        await wait(10, (r) => setGapRemaining(r));
                    }

                    onProblemEnd?.(idx);
                    continue; // 다음 iteration에서 17번으로 감
                }

                // 17번: 대본이 16번과 공유되므로 skip (위에서 이미 처리)
                if (problem.number === 17) {
                    onProblemStart?.(idx);
                    onProblemEnd?.(idx);
                    continue;
                }

                // ── 일반 문제 (1~15번) ──
                onProblemStart?.(idx);

                // ── 딩동! (문제 시작) ──
                try { await playChime(audioCtxRef.current); } catch {}
                await delay(300);

                // ── 대본 재생 ──
                setPhase('playing');
                try {
                    await playProblemScript(problem);
                } catch (err) {
                    console.warn(`[TTS] Problem ${problem.number} playback failed:`, err);
                    const totalChars = (problem.script || []).reduce((sum, line) => sum + (line.text?.length || 0), 0);
                    await delay(Math.max(5000, totalChars * 80));
                }

                // ── 딩동! (대본 끝) ──
                try { await playChime(audioCtxRef.current); } catch {}

                onProblemEnd?.(idx);

                // ── 다음 문제 전 간격 ──
                const isLastProblem = idx === problems.length - 1;
                if (!isLastProblem) {
                    const gap = problem.gapAfterSeconds || 11;
                    setPhase('gap');

                    // Look-ahead: prefetch next 2 problems during gap
                    const lookAheadPromises: Promise<boolean>[] = [];
                    for (let la = 1; la <= 2; la++) {
                        const nextIdx = idx + la;
                        if (nextIdx < problems.length) {
                            lookAheadPromises.push(
                                prefetchProblemAudio(problems[nextIdx]).catch(() => false)
                            );
                        }
                    }
                    await Promise.all([
                        wait(gap, (r) => setGapRemaining(r)),
                        ...lookAheadPromises,
                    ]);
                }
            }

            // ─── 5. 듣기 종료 → 전환 ───
            setPhase('transition');
            onTransitionStart?.();
            await speakLines(TRANSITION_SCRIPT);

            // 60초 전환 대기
            await wait(TRANSITION_DELAY_SECONDS, (r) => setTransitionRemaining(r));

            // ─── 6. 독해 시간 ───
            setPhase('reading_time');
            onAllComplete?.();
            setPhase('done');

        } catch (fatalError) {
            // ★ 최후의 보루: 여기까지 오면 뭔가 정말 심각한 에러.
            // 그래도 크래시는 절대 안 됨. done으로 전환하여 학생이 최소한 답안을 제출할 수 있게.
            console.error('[TTS] Fatal error in listening sequence:', fatalError);
            setPhase('done');
            setCanViewReading(true);
        }

    }, [phase, problems, playProblemScript, speakLines, wait, prefetchProblemAudio,
        onPageTurn, onProblemStart, onProblemEnd, onTransitionStart, onAllComplete]);

    return {
        phase,
        currentProblemIndex,
        currentLineIndex,
        elapsedSeconds,
        gapRemaining,
        transitionRemaining,
        isSecondPlay,
        canViewReading,
        preparingProgress,
        prepareAudio,
        beginExam,
        stopListening,
    };
}
