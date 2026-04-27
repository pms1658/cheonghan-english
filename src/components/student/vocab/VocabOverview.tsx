import { Word } from '@/types';
import { useTTS } from '@/hooks/useTTS';

interface VocabOverviewProps {
    title: string;
    words: Word[];
    config: any;
    isStudied?: boolean;
    onStartStudy: () => void;
    onStartTest: () => void;
    onExit?: () => void;
}

export default function VocabOverview({ title, words = [], config = {}, isStudied, onStartStudy, onStartTest, onExit }: VocabOverviewProps) {
    const { speak } = useTTS();
    const safeWords = Array.isArray(words) ? words : [];

    return (
        <div className="pb-4">
            {/* Navy Header — Unified Full-Width */}
            <div className="sticky top-0 z-40 bg-[#0A0E27] px-4 py-4 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -ml-24 -mb-24"></div>

                <div className="max-w-4xl mx-auto relative z-10">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-emerald-400/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/30">
                                Vocabulary
                            </span>
                            {isStudied && (
                                <span className="px-2 py-0.5 rounded bg-blue-400/20 text-blue-300 text-[10px] font-bold border border-blue-400/30">
                                    Study Completed
                                </span>
                            )}
                        </div>
                        {onExit && (
                            <button onClick={onExit} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-lg text-xs font-bold transition-all border border-white/10">
                                나가기
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                            </button>
                        )}
                    </div>
                    <h1 className="text-lg font-bold text-white mb-2">{title}</h1>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                        <div className="flex items-center gap-1.5">
                            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                            <span className="font-bold text-white">{safeWords.length}</span> Words
                        </div>
                        <div className="w-px h-3 bg-white/20"></div>
                        <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white">{config?.studyMode === 'flashcard' ? 'Flashcard' : 'Selection'}</span> Mode
                        </div>
                    </div>
                </div>
            </div>

            {/* Word List (Grid) */}
            <div className="max-w-4xl mx-auto p-4 lg:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                {safeWords.map((word, idx) => {
                    if (!word) return null; // Defensive check for null words
                    return (
                        <div key={idx} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-white/10 shadow-sm flex flex-col gap-2">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-300 w-5">{idx + 1}</span>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">{word.term || 'No Term'}</h3>
                                    {word.pronunciation && (
                                        <span className="text-xs text-slate-400 font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 mr-1">{word.pronunciation}</span>
                                    )}
                                    {word.partOfSpeech && (
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 uppercase tracking-tight">{word.partOfSpeech}</span>
                                    )}
                                </div>
                                {/* Sound Icon */}
                                <button
                                    onClick={() => word.term && speak(word.term)}
                                    className="p-1.5 text-slate-300 hover:text-blue-500 transition-colors rounded-full hover:bg-blue-50"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path></svg>
                                </button>
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 font-medium pl-7">{word.meaning || 'No Meaning'}</p>
                            {word.contextSentence && (
                                <div className="mt-1 pl-7 text-xs text-black dark:text-slate-300 font-['Apple_SD_Gothic_Neo'] border-l-2 border-slate-100 dark:border-slate-600 pl-2">
                                    &quot;{word.contextSentence}&quot;
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            </div>

            {/* Floating Action Bar */}
            <div className="sticky bottom-0 px-6 pb-[max(1.5rem,calc(env(safe-area-inset-bottom)+3.5rem))] pt-4 max-w-4xl mx-auto flex gap-3 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800">
                <button
                    onClick={() => {
                        const printWindow = window.open('', '_blank', 'width=800,height=600');
                        if (!printWindow) return;
                        const rows = safeWords.map((w, i) => `<tr><td>${i + 1}</td><td class="term">${w.term || ''}</td><td>${w.meaning || ''}</td></tr>`).join('');
                        printWindow.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>
                            @page { size: A4; margin: 15mm; }
                            * { margin: 0; padding: 0; box-sizing: border-box; }
                            body { font-family: 'Malgun Gothic', sans-serif; color: #1d1d1f; }
                            h2 { font-size: 16pt; font-weight: 900; border-bottom: 2px solid #1d1d1f; padding-bottom: 8px; margin-bottom: 12px; text-align: center; }
                            .name-line { text-align: right; font-size: 10pt; color: #86868b; margin-bottom: 16px; }
                            table { width: 100%; border-collapse: collapse; font-size: 10pt; }
                            th { background: #f5f5f7; text-align: left; padding: 6px 10px; border: 1px solid #d2d2d7; font-size: 8pt; font-weight: 700; }
                            td { padding: 5px 10px; border: 1px solid #e5e5e7; }
                            td.term { font-weight: 700; }
                        </style></head><body>
                            <h2>${title}</h2>
                            <div class="name-line">이름: ________________</div>
                            <table><thead><tr><th>No.</th><th>단어</th><th>뜻</th></tr></thead><tbody>${rows}</tbody></table>
                            <script>window.onload = function() { window.print(); }<\/script>
                        </body></html>`);
                        printWindow.document.close();
                    }}
                    className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-400 font-bold shadow-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center"
                    title="인쇄"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                </button>
                {config?.studyMode === 'flashcard' && (
                    <button
                        onClick={onStartStudy}
                        className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 py-4 rounded-2xl font-bold shadow-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                        암기 학습
                    </button>
                )}
                <button
                    onClick={() => {
                        if (confirm('바로 테스트를 시작하시겠습니까?')) onStartTest();
                    }}
                    className={`flex-1 py-4 rounded-2xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2
                    ${config?.studyMode === 'flashcard'
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                            : 'bg-[#0A0E27] text-white hover:bg-[#151b40]'}`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    테스트 시작
                </button>
            </div>
            {/* Safe Area Spacer */}
            <div className="h-12"></div>
        </div>
    );
}
