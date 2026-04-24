'use client';

import { useState, useEffect } from 'react';
import { Assignment, ListeningProblem, ReadingProblem } from '@/types';
import { dbService } from '@/services/db';
import { storage } from '@/lib/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import ClassSelector from './ClassSelector';
import ChartRenderer from '@/components/student/ChartRenderer';
import { toast } from 'sonner';

interface ListeningSetFormProps {
    selectedClass: any;
    initialData?: Assignment | null;
    onBack: () => void;
    onSave: (data: any) => Promise<void>;
}

const GRADE_OPTIONS = [
    { v: '1', l: 'Í≥?' },
    { v: '2', l: 'Í≥?' },
    { v: '3', l: 'Í≥?/?òÎä•' },
];

const BATCH_LABELS = [
    { key: 'listening_1_5', label: '?£Í∏∞ 1~5Î≤?, icon: '?îä' },
    { key: 'listening_6_10', label: '?£Í∏∞ 6~10Î≤?, icon: '?îä' },
    { key: 'listening_11_15', label: '?£Í∏∞ 11~15Î≤?, icon: '?îä' },
    { key: 'listening_16_17', label: '?£Í∏∞ 16~17Î≤?, icon: '?îÅ' },
    { key: 'reading_18_20', label: '?ÖÌï¥ 18~20Î≤?, icon: '?ìñ' },
    { key: 'reading_25_28', label: '?ÖÌï¥ 25~28Î≤?, icon: '?ìñ' },
    { key: 'reading_43_45', label: '?ÖÌï¥ 43~45Î≤?, icon: '?ìñ' },
    { key: 'picture', label: '4Î≤?Í∑∏Î¶º ?ùÏÑ±', icon: '?ñºÔ∏? },
];

export default function ListeningSetForm({ selectedClass, initialData, onBack, onSave }: ListeningSetFormProps) {
    const [title, setTitle] = useState(initialData?.title || '');
    const [targetGrade, setTargetGrade] = useState(
        initialData?.listeningSetConfig?.targetGrade || '3'
    );
    const [selectedClassIds, setSelectedClassIds] = useState<string[]>(
        initialData?.classIds || (selectedClass ? [selectedClass.id] : [])
    );
    const [availableClasses, setAvailableClasses] = useState<{ id: string; name: string }[]>([]);

    // Generation state
    const [isGenerating, setIsGenerating] = useState(false);
    const [batchStatus, setBatchStatus] = useState<Record<string, 'pending' | 'done' | 'error'>>({});
    const [generationProgress, setGenerationProgress] = useState(0);

    // Generated data
    const [listeningProblems, setListeningProblems] = useState<ListeningProblem[]>([]);
    const [readingProblems, setReadingProblems] = useState<ReadingProblem[]>([]);
    const [pictureDescription, setPictureDescription] = useState<string | null>(null);

    // TTS pre-cache state
    const [isGeneratingTTS, setIsGeneratingTTS] = useState(false);
    const [ttsProgress, setTtsProgress] = useState(0);
    const [ttsTotalSteps, setTtsTotalSteps] = useState(0);
    const [ttsCurrentLabel, setTtsCurrentLabel] = useState('');
    const [cachedAudioUrls, setCachedAudioUrls] = useState<Record<number, string>>({});

    // Picture generation state
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);

    // Review state
    const [reviewTab, setReviewTab] = useState<'listening' | 'reading'>('listening');
    const [expandedProblem, setExpandedProblem] = useState<number | null>(null);

    // Title suggestions
    const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
    const [showTitleSuggestions, setShowTitleSuggestions] = useState(false);

    // Hydrate from initialData when editing
    useEffect(() => {
        if (initialData) {
            if (initialData.listeningProblems?.length) {
                setListeningProblems(initialData.listeningProblems);
            }
            if (initialData.readingProblems?.length) {
                setReadingProblems(initialData.readingProblems);
            }
            // Restore audioUrls from existing problems
            const urls: Record<number, string> = {};
            initialData.listeningProblems?.forEach(p => {
                if (p.audioUrl) urls[p.number] = p.audioUrl;
            });
            if (Object.keys(urls).length > 0) setCachedAudioUrls(urls);
        }
    }, [initialData]);

    useEffect(() => {
        const loadClasses = async () => {
            try {
                const cls = await dbService.getClasses();
                setAvailableClasses(cls.map(c => ({ id: c.id, name: c.name })));
            } catch (e) { console.error(e); }
        };
        loadClasses();
    }, []);

    useEffect(() => {
        let alive = true;
        const fetchTitles = async () => {
            try {
                const assignments = await dbService.getAssignments();
                if (!alive) return;
                const titles: string[] = [];
                const seen = new Set<string>();
                assignments.forEach(a => {
                    if (a.title && !seen.has(a.title)) {
                        seen.add(a.title);
                        titles.push(a.title);
                    }
                });
                setTitleSuggestions(titles);
            } catch (e) { console.error(e); }
        };
        fetchTitles();
        return () => { alive = false; };
    }, []);

    // ?Ä?Ä Generate ?Ä?Ä
    const handleGenerate = async () => {
        setIsGenerating(true);
        setGenerationProgress(0);
        setBatchStatus(
            Object.fromEntries(BATCH_LABELS.map(b => [b.key, 'pending' as const]))
        );
        setListeningProblems([]);
        setReadingProblems([]);

        try {
            const res = await fetch('/api/generate-listening-set', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetGrade }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || '?ùÏÑ± ?§Ìå®');
            }

            const data = await res.json();

            // Update batch statuses based on actual results
            const newStatus: Record<string, 'pending' | 'done' | 'error'> = {};
            BATCH_LABELS.forEach(b => {
                if (b.key === 'picture') {
                    newStatus[b.key] = data.pictureDescription ? 'done' : 'pending';
                } else {
                    newStatus[b.key] = 'done';
                }
            });

            if (data.summary?.errors) {
                data.summary.errors.forEach((e: string) => {
                    const batchKey = BATCH_LABELS.find(b => e.includes(b.key))?.key;
                    if (batchKey) newStatus[batchKey] = 'error';
                });
            }

            setBatchStatus(newStatus);
            setListeningProblems(data.listeningProblems || []);
            setReadingProblems(data.readingProblems || []);
            setPictureDescription(data.pictureDescription || null);
            setGenerationProgress(100);

            const total = (data.listeningProblems?.length || 0) + (data.readingProblems?.length || 0);
            toast.success(`??Ï¥?${total}Î¨∏Ï†ú ?ùÏÑ± ?ÑÎ£å!`);
        } catch (error: any) {
            toast.error(`?ùÏÑ± ?§Ìå®: ${error.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    // ?Ä?Ä Helper: create WAV header (PCM 16-bit 16kHz mono) ?Ä?Ä
    const createWavHeader = (pcmLength: number): Uint8Array => {
        const sampleRate = 16000, channels = 1, bitsPerSample = 16;
        const byteRate = sampleRate * channels * bitsPerSample / 8;
        const blockAlign = channels * bitsPerSample / 8;
        const header = new ArrayBuffer(44);
        const view = new DataView(header);

        const writeStr = (offset: number, str: string) => {
            for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
        };
        writeStr(0, 'RIFF');
        view.setUint32(4, 36 + pcmLength, true);
        writeStr(8, 'WAVE');
        writeStr(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, channels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitsPerSample, true);
        writeStr(36, 'data');
        view.setUint32(40, pcmLength, true);
        return new Uint8Array(header);
    };

    // ?Ä?Ä Helper: create silence bytes (PCM 16-bit 16kHz mono) ?Ä?Ä
    const createSilenceBytes = (durationMs: number): Uint8Array => {
        const samples = Math.floor((durationMs / 1000) * 16000);
        return new Uint8Array(samples * 2); // 16-bit = 2 bytes
    };

    // ?Ä?Ä Helper: fade-in/fade-out for click noise prevention ?Ä?Ä
    const applyFadeBytes = (pcm: Uint8Array, fadeSamples = 80): Uint8Array => {
        const result = new Uint8Array(pcm);
        const view = new DataView(result.buffer, result.byteOffset, result.byteLength);
        const totalSamples = Math.floor(result.length / 2);
        if (totalSamples < fadeSamples * 2) return result;

        for (let i = 0; i < fadeSamples; i++) {
            const offset = i * 2;
            const sample = view.getInt16(offset, true);
            view.setInt16(offset, Math.round(sample * (i / fadeSamples)), true);
        }
        for (let i = 0; i < fadeSamples; i++) {
            const offset = (totalSamples - fadeSamples + i) * 2;
            const sample = view.getInt16(offset, true);
            view.setInt16(offset, Math.round(sample * ((fadeSamples - i) / fadeSamples)), true);
        }
        return result;
    };

    // ?Ä?Ä AI Picture Generation (Imagen 4) ?Ä?Ä
    const handleGenerateImage = async (problemIndex: number) => {
        const problem = listeningProblems[problemIndex];
        if (!problem.pictureDescription) {
            toast.error('Í∑∏Î¶º Î¨òÏÇ¨(pictureDescription)Í∞Ä ?ÜÏäµ?àÎã§.');
            return;
        }

        setIsGeneratingImage(true);
        const toastId = toast.loading('AI Í∑∏Î¶º ?ùÏÑ± Ï§?..');

        try {
            const res = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: problem.pictureDescription }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || err.details || res.statusText);
            }

            const data = await res.json();
            if (!data.imageBase64) throw new Error('No image returned');

            // Upload to Firebase Storage
            toast.loading('?ùÏÑ±???¥Î?ÏßÄ ?Ä??Ï§?..', { id: toastId });
            const byteCharacters = atob(data.imageBase64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'image/jpeg' });

            const assignmentId = initialData?.id || `ls_${Date.now()}`;
            const storageRef = ref(storage, `images/${assignmentId}/problem_${problem.number}.jpg`);
            await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
            const url = await getDownloadURL(storageRef);

            // Update state
            const newProblems = [...listeningProblems];
            newProblems[problemIndex] = { ...problem, pictureUrl: url };
            setListeningProblems(newProblems);

            toast.success('AI Í∑∏Î¶º ?ùÏÑ± Î∞??Ä???ÑÎ£å!', { id: toastId });
        } catch (error: any) {
            console.error('Image generation error:', error);
            toast.error(`?ùÏÑ± ?§Ìå®: ${error.message}`, { id: toastId });
        } finally {
            setIsGeneratingImage(false);
        }
    };

    // ?Ä?Ä Manual Picture Upload ?Ä?Ä
    const handleUploadImage = async (problemIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const toastId = toast.loading('?¥Î?ÏßÄ ?ÖÎ°ú??Ï§?..');
        try {
            const assignmentId = initialData?.id || `ls_${Date.now()}`;
            const problem = listeningProblems[problemIndex];
            const storageRef = ref(storage, `images/${assignmentId}/problem_${problem.number}_manual.jpg`);
            await uploadBytes(storageRef, file, { contentType: file.type });
            const url = await getDownloadURL(storageRef);

            const newProblems = [...listeningProblems];
            newProblems[problemIndex] = { ...problem, pictureUrl: url };
            setListeningProblems(newProblems);

            toast.success('?ÖÎ°ú???ÑÎ£å!', { id: toastId });
        } catch (error: any) {
            console.error('Upload error:', error);
            toast.error(`?ÖÎ°ú???§Ìå®: ${error.message}`, { id: toastId });
        }
    };

    // ?Ä?Ä TTS Pre-cache: via /api/tts-problem (MP3 ?ïÏ∂ï) ??Firebase ?Ä?Ä
    const handleGenerateTTS = async () => {
        if (listeningProblems.length === 0) return toast.warning('Î¨∏Ï†úÎ•?Î®ºÏ? ?ùÏÑ±?¥Ï£º?∏Ïöî.');

        setIsGeneratingTTS(true);
        setTtsProgress(0);
        setTtsTotalSteps(listeningProblems.length);
        const audioUrls: Record<number, string> = {};
        const assignmentId = `ls_${Date.now()}`;
        let failCount = 0;

        for (let i = 0; i < listeningProblems.length; i++) {
            const problem = listeningProblems[i];
            if (!problem.script || problem.script.length === 0) {
                setTtsProgress(i + 1);
                continue;
            }

            setTtsCurrentLabel(`${problem.number}Î≤??åÏÑ± ?ùÏÑ± Ï§?.. (${i + 1}/${listeningProblems.length})`);

            try {
                // ???úÎ≤Ñ?êÏÑú ??Î≤àÏóê Í≤∞Ìï© + MP3 ?ïÏ∂ï
                const res = await fetch('/api/tts-problem', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        lines: problem.script.map(line => ({
                            text: line.text,
                            speaker: line.speaker || 'M',
                            lang: line.lang || (line.speaker === 'N' ? 'ko' : 'en'),
                        })),
                        problemNumber: problem.number,
                    }),
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || `API ${res.status}`);
                }

                const data = await res.json();
                if (!data.audioContent) throw new Error('No audio returned');

                // Decode base64 to binary
                const binaryStr = atob(data.audioContent);
                const bytes = new Uint8Array(binaryStr.length);
                for (let j = 0; j < binaryStr.length; j++) bytes[j] = binaryStr.charCodeAt(j);

                // Upload MP3 to Firebase Storage
                setTtsCurrentLabel(`${problem.number}Î≤??ÖÎ°ú??Ï§?..`);
                const ext = data.format === 'mp3' ? 'mp3' : 'wav';
                const contentType = data.format === 'mp3' ? 'audio/mpeg' : 'audio/wav';
                const storageRef = ref(storage, `tts/${assignmentId}/problem_${problem.number}.${ext}`);
                await uploadBytes(storageRef, bytes, { contentType });
                const url = await getDownloadURL(storageRef);
                audioUrls[problem.number] = url;
                toast.success(`??${problem.number}Î≤??ÑÎ£å (${(bytes.length / 1024).toFixed(0)}KB ${ext.toUpperCase()})`);

            } catch (err: any) {
                console.error(`TTS error for problem ${problem.number}:`, err.message);
                toast.error(`${problem.number}Î≤??§Ìå®: ${err.message?.slice(0, 50)}`);
                failCount++;
            }

            setTtsProgress(i + 1);
        }

        setCachedAudioUrls(audioUrls);

        const updatedProblems = listeningProblems.map(p => ({
            ...p,
            audioUrl: audioUrls[p.number] || p.audioUrl,
        }));
        setListeningProblems(updatedProblems);

        const successCount = Object.keys(audioUrls).length;
        if (failCount > 0) {
            toast.warning(`?îä TTS ?ÑÎ£å: ${successCount}Í∞??±Í≥µ, ${failCount}Í∞??§Ìå®`);
        } else {
            toast.success(`?îä TTS MP3 ?ùÏÑ± ?ÑÎ£å! ${successCount}/${listeningProblems.length}Í∞?Ï∫êÏã±??);
        }
        setIsGeneratingTTS(false);
        setTtsCurrentLabel('');
    };

    const handleSave = async () => {
        if (!title.trim()) return toast.warning('?úÎ™©???ÖÎ†•?¥Ï£º?∏Ïöî.');
        if (listeningProblems.length === 0) return toast.warning('Î¨∏Ï†úÎ•?Î®ºÏ? ?ùÏÑ±?¥Ï£º?∏Ïöî.');

        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

        // Helper to prevent Firestore "Unsupported field value: undefined" error
        const removeUndefined = (obj: any): any => {
            if (Array.isArray(obj)) return obj.map(removeUndefined);
            if (obj !== null && typeof obj === 'object') {
                const newObj: any = {};
                for (const key in obj) {
                    if (obj[key] !== undefined) {
                        newObj[key] = removeUndefined(obj[key]);
                    }
                }
                return newObj;
            }
            return obj;
        };

        const payload = removeUndefined({
            title,
            deadline: nextWeek.toISOString().split('T')[0],
            category: 'sat',
            type: 'listening_set',
            content: '',
            targetGrade,
            sentences: [],
            classIds: selectedClassIds,
            listeningSetConfig: {
                targetGrade,
                gapBetweenProblems: 10,
                readingOrder: [43, 44, 45, 25, 26, 27, 28, 18, 19, 20],
            },
            listeningProblems,
            readingProblems,
        });

        await onSave(payload);
    };

    const totalProblems = listeningProblems.length + readingProblems.length;
    const hasResults = totalProblems > 0;

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-3 shadow-sm">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        </button>
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded">?éß ?£Í∏∞</span>
                            <h1 className="text-lg font-bold text-slate-900">?£Í∏∞?∏Ìä∏ ?ùÏÑ±</h1>
                        </div>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={!hasResults}
                        className="px-4 py-1.5 bg-[#1e3a5f] text-white rounded-lg text-sm font-bold shadow-lg hover:bg-[#2a4d75] disabled:opacity-50 transition-colors"
                    >
                        ?Ä??
                    </button>
                </div>
            </header>

            <div className="max-w-3xl mx-auto p-4 space-y-6">
                {/* 1. Settings */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-5">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">?úÌóò ?úÎ™©</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => { setTitle(e.target.value); setShowTitleSuggestions(true); }}
                                onFocus={() => setShowTitleSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowTitleSuggestions(false), 200)}
                                placeholder="?? 2024??9??Î™®ÏùòÍ≥†ÏÇ¨ ?£Í∏∞?∏Ìä∏"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            {showTitleSuggestions && titleSuggestions.length > 0 && (
                                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-[320px] overflow-y-auto">
                                    {titleSuggestions
                                        .filter(t => t.toLowerCase().includes(title.toLowerCase()))
                                        .slice(0, 10)
                                        .map((t, i) => (
                                            <div
                                                key={i}
                                                onMouseDown={() => { setTitle(t); setShowTitleSuggestions(false); }}
                                                className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-slate-700 font-medium border-b border-slate-50 last:border-0"
                                            >
                                                {t}
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">?ôÎÖÑ</label>
                            <div className="flex gap-2">
                                {GRADE_OPTIONS.map(g => (
                                    <button
                                        key={g.v}
                                        onClick={() => setTargetGrade(g.v)}
                                        className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${
                                            targetGrade === g.v
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        {g.l}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">Î¨∏Ï†ú Íµ¨ÏÑ±</label>
                            <div className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                                ?îä ?£Í∏∞ 17Î¨∏Ï†ú + ?ìñ ?ÖÌï¥ 10Î¨∏Ï†ú = <span className="font-bold text-blue-700">Ï¥?27Î¨∏Ï†ú</span>
                            </div>
                        </div>
                    </div>

                    <ClassSelector
                        classes={availableClasses}
                        selectedClassIds={selectedClassIds}
                        onChange={setSelectedClassIds}
                    />

                    {/* Generate Button */}
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {isGenerating ? (
                            <>
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                                AI ?ùÏÑ± Ï§?.. (??30~60Ï¥??åÏöî)
                            </>
                        ) : hasResults ? (
                            '?îÑ ?§Ïãú ?ùÏÑ±'
                        ) : (
                            '?éß ?£Í∏∞?∏Ìä∏ ?ùÏÑ±'
                        )}
                    </button>
                </div>

                {/* 2. Generation Progress */}
                {isGenerating && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                        <h2 className="text-sm font-bold text-slate-700 mb-4">???ùÏÑ± ÏßÑÌñâ??/h2>
                        <div className="space-y-2">
                            {BATCH_LABELS.map(b => (
                                <div key={b.key} className="flex items-center gap-3">
                                    <span className="text-sm">{b.icon}</span>
                                    <span className="text-sm text-slate-700 flex-1">{b.label}</span>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                        batchStatus[b.key] === 'done'
                                            ? 'bg-green-100 text-green-700'
                                            : batchStatus[b.key] === 'error'
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-amber-100 text-amber-700'
                                    }`}>
                                        {batchStatus[b.key] === 'done' ? '???ÑÎ£å' : batchStatus[b.key] === 'error' ? '???§Ìå®' : '???ùÏÑ± Ï§?..'}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-pulse" style={{ width: '60%' }} />
                        </div>
                    </div>
                )}
                {/* 3. TTS Pre-cache Section */}
                {hasResults && !isGenerating && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    ?îä TTS ?¨Ï†Ñ Ï∫êÏã±
                                    {Object.keys(cachedAudioUrls).length > 0 && (
                                        <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                                            ??{Object.keys(cachedAudioUrls).length}Í∞??ÑÎ£å
                                        </span>
                                    )}
                                </h2>
                                <p className="text-xs text-slate-500 mt-1">
                                    ?ôÏÉù ?£Í∏∞ ???úÎ†à???ÜÏù¥ Ï¶âÏãú ?¨ÏÉù?©Îãà?? ?Ä???ÑÏóê ?ùÏÑ±?òÏÑ∏??
                                </p>
                            </div>
                            <button
                                onClick={handleGenerateTTS}
                                disabled={isGeneratingTTS}
                                className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {isGeneratingTTS ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                                        ?ùÏÑ± Ï§?..
                                    </>
                                ) : Object.keys(cachedAudioUrls).length > 0 ? (
                                    '?îÑ ?§Ïãú ?ùÏÑ±'
                                ) : (
                                    '?îä TTS ?ùÏÑ±'
                                )}
                            </button>
                        </div>

                        {/* TTS Generation Progress */}
                        {isGeneratingTTS && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-600 font-medium">{ttsCurrentLabel}</span>
                                    <span className="text-amber-600 font-bold">{ttsProgress}/{ttsTotalSteps}</span>
                                </div>
                                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all duration-300"
                                        style={{ width: `${ttsTotalSteps > 0 ? (ttsProgress / ttsTotalSteps) * 100 : 0}%` }}
                                    />
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {listeningProblems.map((p) => (
                                        <div
                                            key={p.number}
                                            className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold ${
                                                cachedAudioUrls[p.number]
                                                    ? 'bg-green-100 text-green-700'
                                                    : ttsProgress > listeningProblems.indexOf(p)
                                                    ? 'bg-amber-100 text-amber-700'
                                                    : 'bg-slate-100 text-slate-400'
                                            }`}
                                        >
                                            {p.number}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Cached URLs Summary */}
                        {Object.keys(cachedAudioUrls).length > 0 && !isGeneratingTTS && (
                            <div className="flex flex-wrap gap-1.5">
                                {listeningProblems.map((p) => (
                                    <div
                                        key={p.number}
                                        className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold ${
                                            cachedAudioUrls[p.number]
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-500'
                                        }`}
                                        title={cachedAudioUrls[p.number] ? 'Ï∫êÏã± ?ÑÎ£å' : 'ÎØ∏Ï∫ê??}
                                    >
                                        {p.number}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 4. Review Section */}
                {hasResults && !isGenerating && (
                    <div className="space-y-4">
                        {/* Tab Header */}
                        <div className="flex items-center gap-3 px-1">
                            <button
                                onClick={() => setReviewTab('listening')}
                                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors ${
                                    reviewTab === 'listening'
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'bg-white text-slate-500 border border-slate-200'
                                }`}
                            >
                                ?îä ?£Í∏∞ ({listeningProblems.length}Î¨∏Ï†ú)
                            </button>
                            <button
                                onClick={() => setReviewTab('reading')}
                                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors ${
                                    reviewTab === 'reading'
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'bg-white text-slate-500 border border-slate-200'
                                }`}
                            >
                                ?ìñ ?ÖÌï¥ ({readingProblems.length}Î¨∏Ï†ú)
                            </button>
                        </div>

                        {/* Listening Problems Review */}
                        {reviewTab === 'listening' && listeningProblems.map((p, idx) => (
                            <div key={p.id || idx} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                <button
                                    onClick={() => setExpandedProblem(expandedProblem === p.number ? null : p.number)}
                                    className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold">{p.number}</span>
                                        <div className="text-left">
                                            <div className="text-sm font-bold text-slate-800">{p.instruction?.slice(0, 40)}...</div>
                                            <div className="text-xs text-slate-500 mt-0.5">
                                                ?ÄÎ≥?{p.script?.length || 0}Ï§?¬∑ ?ïÎãµ ?™‚ë†?°‚ë¢?£‚ë§[{(p.correctAnswer || 0) + 1}]
                                                {p.needsMemo && ' ¬∑ ?ìùÎ©îÎ™®'}
                                                {p.playTwice && ' ¬∑ ?îÅ?êÎ≤à?¨ÏÉù'}
                                            </div>
                                        </div>
                                    </div>
                                    <svg className={`w-5 h-5 text-slate-400 transition-transform ${expandedProblem === p.number ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </button>

                                {expandedProblem === p.number && (
                                    <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-4">
                                        {/* Script */}
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-500 mb-2">?ìú ?ÄÎ≥?/h4>
                                            <div className="bg-slate-50 rounded-xl p-3 space-y-1 max-h-60 overflow-y-auto text-sm">
                                                {p.script?.map((line, li) => (
                                                    <div key={li} className="flex gap-2">
                                                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                                                            line.speaker === 'M' ? 'bg-blue-100 text-blue-700' :
                                                            line.speaker === 'W' ? 'bg-pink-100 text-pink-700' :
                                                            'bg-gray-100 text-gray-600'
                                                        }`}>{line.speaker}</span>
                                                        <span className="text-slate-700">{line.text}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Choices */}
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-500 mb-2">?†ÌÉùÏßÄ</h4>
                                            <div className="space-y-1.5">
                                                {p.choices?.map((c, ci) => (
                                                    <div key={ci} className={`flex gap-2 text-sm ${ci === p.correctAnswer ? 'font-bold text-blue-700' : 'text-slate-600'}`}>
                                                        <span className={`w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full text-[11px] font-bold ${
                                                            ci === p.correctAnswer ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
                                                        }`}>{ci + 1}</span>
                                                        <span>{c}</span>
                                                        {ci === p.correctAnswer && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">?ïÎãµ</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* 4Î≤?Í∑∏Î¶º Í¥ÄÎ¶?*/}
                                        {p.number === 4 && (
                                            <div>
                                                <h4 className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
                                                    <span>?ñºÔ∏?Í∑∏Î¶º (4Î≤??ÑÏö©)</span>
                                                </h4>
                                                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 space-y-4">
                                                    {(p as any).pictureDescription && (
                                                        <p className="text-[11px] text-amber-700 italic flex gap-1">
                                                            <span className="font-bold">?ÑÎ°¨?ÑÌä∏:</span> {(p as any).pictureDescription}
                                                        </p>
                                                    )}
                                                    
                                                    {/* Controls */}
                                                    <div className="flex flex-wrap gap-2">
                                                        <button
                                                            onClick={(e) => { e.preventDefault(); handleGenerateImage(idx); }}
                                                            disabled={isGeneratingImage}
                                                            className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-[11px] font-bold shadow hover:shadow-md disabled:opacity-50 flex items-center gap-1.5"
                                                        >
                                                            {isGeneratingImage ? (
                                                                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                                                            ) : '?§ñ AI Î™®ÏùòÍ≥†ÏÇ¨ Í∑∏Î¶º ?ùÏÑ±'}
                                                        </button>
                                                        
                                                        <label className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-[11px] font-bold shadow-sm hover:bg-slate-50 cursor-pointer flex items-center gap-1.5">
                                                            <span>?ì§ ÏßÅÏ†ë ?ÖÎ°ú??/span>
                                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadImage(idx, e)} />
                                                        </label>
                                                    </div>

                                                    {/* Preview */}
                                                    {p.pictureUrl ? (
                                                        <div className="relative border-2 border-slate-300 rounded-lg overflow-hidden bg-white max-w-sm mt-3">
                                                            <div className="text-[10px] text-blue-600 bg-blue-50 px-2 py-1 text-center font-bold">
                                                                ?ëá ?¥Î?ÏßÄÎ•??¥Î¶≠?òÏó¨ Í∏∞Ìò∏(????Î•?Î∞∞Ïπò?òÏÑ∏??
                                                            </div>
                                                            <div className="relative w-full" onClick={(e) => {
                                                                const rect = e.currentTarget.getBoundingClientRect();
                                                                const x = ((e.clientX - rect.left) / rect.width) * 100;
                                                                const y = ((e.clientY - rect.top) / rect.height) * 100;
                                                                const markers = p.pictureMarkers || [];
                                                                if (markers.length < 5) {
                                                                    const newProblems = [...listeningProblems];
                                                                    newProblems[idx] = { ...p, pictureMarkers: [...markers, { x, y }] };
                                                                    setListeningProblems(newProblems);
                                                                }
                                                            }}>
                                                                <img src={p.pictureUrl} alt="Í∑∏Î¶º Î¨∏Ï†ú" className="w-full h-auto cursor-crosshair" />
                                                                {p.pictureMarkers?.map((m, mi) => (
                                                                    <div key={mi} className="absolute flex items-center justify-center w-6 h-6 bg-white border border-slate-900 rounded-full font-bold text-slate-900 text-xs shadow-md z-10 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ left: `${m.x}%`, top: `${m.y}%` }}>
                                                                        {mi + 1}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            {p.pictureMarkers && p.pictureMarkers.length > 0 && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        const newProblems = [...listeningProblems];
                                                                        newProblems[idx] = { ...p, pictureMarkers: [] };
                                                                        setListeningProblems(newProblems);
                                                                    }}
                                                                    className="w-full mt-1 py-1.5 bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors"
                                                                >
                                                                    ?óëÔ∏?Í∏∞Ìò∏ Ï¥àÍ∏∞??
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (p as any).pictureElements ? (
                                                        <div className="mt-3">
                                                            <div className="text-[10px] text-slate-500 mb-1">?†Ô∏è Í∑∏Î¶º???ùÏÑ±/?ÖÎ°ú?úÎêòÏßÄ ?äÏúºÎ©??ÑÎûò Í∏∞Î≥∏ ?ÑÏù¥ÏΩ??ïÌÉúÎ°??úÍ≥µ?©Îãà??</div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                {((p as any).pictureElements as any[]).map((el: any, ei: number) => (
                                                                    <div key={ei} className="flex items-start gap-2 bg-white rounded-lg p-2 border border-amber-100">
                                                                        <span className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">{el.number}</span>
                                                                        <div>
                                                                            <div className="text-xs font-bold text-slate-700">{el.item}</div>
                                                                            <div className="text-[10px] text-slate-400">{el.position}</div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </div>
                                        )}

                                        {/* 10Î≤??ÑÌëú(?? ÎØ∏Î¶¨Î≥¥Í∏∞ */}
                                        {p.number === 10 && (p as any).chartData && (
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-500 mb-2">?ìä ??ÎØ∏Î¶¨Î≥¥Í∏∞</h4>
                                                <div className="bg-violet-50 rounded-xl p-4 border border-violet-200">
                                                    <ChartRenderer chartData={(p as any).chartData} />
                                                </div>
                                            </div>
                                        )}

                                        {/* Explanation */}
                                        <div className="bg-blue-50 rounded-xl p-3">
                                            <div className="text-[11px] font-bold text-blue-700 mb-1">?í° ?¥ÏÑ§</div>
                                            <div className="text-sm text-blue-800">{p.explanation}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Reading Problems Review */}
                        {reviewTab === 'reading' && readingProblems.map((p, idx) => (
                            <div key={p.id || idx} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                <button
                                    onClick={() => setExpandedProblem(expandedProblem === p.number ? null : p.number)}
                                    className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-sm font-bold">{p.number}</span>
                                        <div className="text-left">
                                            <div className="text-sm font-bold text-slate-800">{p.question?.slice(0, 40)}...</div>
                                            <div className="text-xs text-slate-500 mt-0.5">
                                                ÏßÄÎ¨?{p.passage?.length || 0}??¬∑ ?ïÎãµ [{(p.correctAnswer || 0) + 1}]
                                                {p.chartData && ' ¬∑ ?ìä?ÑÌëú'}
                                                {p.longPassageGroup && ' ¬∑ ?ìñ?•Î¨∏'}
                                            </div>
                                        </div>
                                    </div>
                                    <svg className={`w-5 h-5 text-slate-400 transition-transform ${expandedProblem === p.number ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </button>

                                {expandedProblem === p.number && (
                                    <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-4">
                                        {/* 25Î≤??ÑÌëú ÎØ∏Î¶¨Î≥¥Í∏∞ */}
                                        {p.number === 25 && p.chartData && (
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-500 mb-2">?ìä ?ÑÌëú ÎØ∏Î¶¨Î≥¥Í∏∞</h4>
                                                <div className="bg-violet-50 rounded-xl p-4 border border-violet-200">
                                                    <ChartRenderer chartData={p.chartData as any} />
                                                </div>
                                            </div>
                                        )}

                                        {/* Passage */}
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-500 mb-2">?ìñ ÏßÄÎ¨?/h4>
                                            <div className="bg-slate-50 rounded-xl p-4 text-sm leading-relaxed text-slate-700 max-h-60 overflow-y-auto whitespace-pre-wrap">
                                                {typeof p.passage === 'string' ? p.passage : JSON.stringify(p.passage, null, 2)}
                                            </div>
                                        </div>

                                        {/* Paragraphs for 43-45 */}
                                        {p.paragraphs && (() => {
                                            // AIÍ∞Ä {A: "...", B: "...", C: "...", D: "..."} ?ïÌÉúÎ°?Ï§???Î∞∞Ïó¥Î°??ïÍ∑ú??
                                            let parasArray: { label: string; text: string }[] = [];
                                            if (Array.isArray(p.paragraphs)) {
                                                parasArray = p.paragraphs;
                                            } else if (typeof p.paragraphs === 'object') {
                                                parasArray = Object.entries(p.paragraphs).map(([key, val]) => ({
                                                    label: key,
                                                    text: typeof val === 'string' ? val : JSON.stringify(val),
                                                }));
                                            }
                                            if (parasArray.length === 0) return null;
                                            return (
                                                <div className="space-y-2">
                                                    {parasArray.map((para, pi) => (
                                                        <div key={pi} className="bg-slate-50 rounded-lg p-3">
                                                            <span className="text-xs font-bold text-slate-500">{String(para.label || '')}</span>
                                                            <p className="text-sm text-slate-700 mt-1">{typeof para.text === 'string' ? para.text : JSON.stringify(para.text)}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })()}

                                        {/* Choices */}
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-500 mb-2">?†ÌÉùÏßÄ</h4>
                                            <div className="space-y-1.5">
                                                {p.choices?.map((c, ci) => (
                                                    <div key={ci} className={`flex gap-2 text-sm ${ci === p.correctAnswer ? 'font-bold text-indigo-700' : 'text-slate-600'}`}>
                                                        <span className={`w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full text-[11px] font-bold ${
                                                            ci === p.correctAnswer ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
                                                        }`}>{ci + 1}</span>
                                                        <span>{typeof c === 'string' ? c : JSON.stringify(c)}</span>
                                                        {ci === p.correctAnswer && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">?ïÎãµ</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Explanation */}
                                        <div className="bg-indigo-50 rounded-xl p-3">
                                            <div className="text-[11px] font-bold text-indigo-700 mb-1">?í° ?¥ÏÑ§</div>
                                            <div className="text-sm text-indigo-800">{typeof p.explanation === 'string' ? p.explanation : JSON.stringify(p.explanation)}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
