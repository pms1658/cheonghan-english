'use client';

import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { WRITING_THEMES, LEVELS, GRADES, WritingSession, WritingTheme, WritingLevel, TargetGrade } from '@/data/writingModules';
import WritingSessionView from '@/components/writing/WritingSessionView';

// Use a rotating set of slate background colors for themes
const THEME_BGS = ['bg-slate-900', 'bg-slate-800', 'bg-slate-950', 'bg-slate-800', 'bg-slate-900'];

// Subcomponent for each Theme's horizontal scroll section
function ThemeScrollSection({
    theme,
    index,
    onSessionClick
}: {
    theme: WritingTheme,
    index: number,
    onSessionClick: (s: WritingSession, t: WritingTheme) => void
}) {
    const scrollRef = useRef<HTMLDivElement>(null);

    const scrollLeft = () => {
        if (scrollRef.current) scrollRef.current.scrollBy({ left: -350, behavior: 'smooth' });
    };

    const scrollRight = () => {
        if (scrollRef.current) scrollRef.current.scrollBy({ left: 350, behavior: 'smooth' });
    };

    const bgClass = THEME_BGS[index % THEME_BGS.length];

    return (
        <div className={`py-20 ${bgClass} text-white overflow-hidden relative group/carousel border-b border-white/5`}>
            <div className="max-w-7xl mx-auto px-6 mb-8 flex justify-between items-end">
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                >
                    <span className="text-[10px] font-black tracking-[0.3em] uppercase mb-3 block" style={{ color: theme.accentHex }}>
                        Theme {String(theme.id).padStart(2, '0')}
                    </span>
                    <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">{theme.name}.</h2>
                    <p className="text-slate-400 text-base md:text-lg font-medium">{theme.nameEn}</p>
                </motion.div>

                {/* Navigation Buttons */}
                <div className="hidden md:flex gap-4">
                    <button
                        onClick={scrollLeft}
                        className="w-12 h-12 rounded-full border border-white/20 bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors active:scale-95"
                    >
                        <ChevronLeft className="w-6 h-6 text-white" />
                    </button>
                    <button
                        onClick={scrollRight}
                        className="w-12 h-12 rounded-full border border-white/20 bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors active:scale-95"
                    >
                        <ChevronRight className="w-6 h-6 text-white" />
                    </button>
                </div>
            </div>

            <div
                ref={scrollRef}
                className="relative w-full overflow-x-auto snap-x snap-mandatory pb-12 flex gap-6 px-6 md:px-[max(2rem,calc((100vw-80rem)/2))] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
                {theme.sessions.map((session, idx) => (
                    <div
                        key={session.id}
                        onClick={() => onSessionClick(session, theme)}
                        className={`snap-center shrink-0 w-[85vw] md:w-[360px] ${bgClass === 'bg-slate-800' ? 'bg-slate-900/50' : 'bg-slate-800'} rounded-3xl p-6 md:p-8 border border-white/10 relative overflow-hidden group hover:bg-slate-700 hover:border-white/20 transition-all cursor-pointer`}
                    >
                        <div className="absolute top-4 right-4 text-8xl font-black text-white/5 group-hover:text-white/10 transition-colors select-none">
                            {idx + 1}
                        </div>
                        <div className="relative z-10 pt-8 flex flex-col h-full">
                            <div className="mb-auto">
                                <div className="flex items-center gap-3 mb-4">
                                    <span
                                        className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black"
                                        style={{ backgroundColor: `${theme.accentHex}20`, color: theme.accentHex }}
                                    >
                                        {String(session.id).padStart(2, '0')}
                                    </span>
                                    <h3 className="text-3xl font-bold tracking-tight text-white line-clamp-2">{session.title}</h3>
                                </div>
                                <p className="text-slate-400 font-medium mb-4 leading-relaxed line-clamp-2">
                                    {session.description}
                                </p>
                            </div>

                            <div className="mt-auto space-y-4 text-sm text-slate-300 border-t border-white/10 pt-4">
                                <div className="bg-slate-900/50 rounded-xl p-4 font-mono text-[11px] leading-relaxed text-slate-300 border border-slate-700/50">
                                    {session.formula}
                                </div>
                                <div className="flex items-center justify-between text-[11px] font-bold mt-4 pt-2">
                                    <span className="text-slate-500 uppercase tracking-widest">{session.problemCount} Problems</span>
                                    <span className="group-hover:translate-x-1 transition-transform" style={{ color: theme.accentHex }}>학습 시작 →</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                <div className="w-6 shrink-0"></div>
            </div>
        </div>
    );
}

export default function WritingGuidePage() {
    const [selectedSession, setSelectedSession] = React.useState<WritingSession | null>(null);
    const [selectedTheme, setSelectedTheme] = React.useState<WritingTheme | null>(null);
    const [selectedLevel, setSelectedLevel] = React.useState<WritingLevel>('bronze');
    const [selectedGrade, setSelectedGrade] = React.useState<TargetGrade>('2');
    const [showLevelSelect, setShowLevelSelect] = React.useState(false);
    const [pendingSession, setPendingSession] = React.useState<{ session: WritingSession; theme: WritingTheme } | null>(null);

    const handleSessionClick = (session: WritingSession, theme: WritingTheme) => {
        setPendingSession({ session, theme });
        setShowLevelSelect(true);
    };

    const handleStartSession = () => {
        if (!pendingSession) return;
        setSelectedSession(pendingSession.session);
        setSelectedTheme(pendingSession.theme);
        setShowLevelSelect(false);
        setPendingSession(null);
    };

    if (selectedSession && selectedTheme) {
        return (
            <WritingSessionView
                session={selectedSession}
                theme={selectedTheme}
                level={selectedLevel}
                targetGrade={selectedGrade}
                onBack={() => { setSelectedSession(null); setSelectedTheme(null); }}
            />
        );
    }

    return (
        <div className="bg-slate-50 dark:bg-slate-950 selection:bg-slate-200 selection:text-slate-900 overflow-x-hidden">

            {/* --- HERO --- */}
            <section className="relative h-[60vh] flex flex-col items-center justify-center text-center px-6">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="w-1 h-6 bg-slate-900 dark:bg-white"></div>
                        <span className="text-sm font-bold tracking-[0.2em] text-slate-500 uppercase">Structural Writing</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-6">
                        Sentence<br />Architecture.
                    </h1>
                    <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
                        문법을 아는 것과 <span className="text-slate-900 dark:text-white font-bold">쓸 수 있는 것</span>은 다릅니다.<br />
                        구문을 마스터하고, <span className="text-slate-900 dark:text-white font-bold">내신 서술형</span>을 정복하세요.
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1, duration: 1 }}
                    className="absolute bottom-12 flex flex-col items-center gap-2"
                >
                    <span className="text-[10px] uppercase tracking-widest text-slate-400">Scroll to Explore</span>
                    <div className="w-px h-12 bg-gradient-to-b from-slate-900 to-transparent opacity-20"></div>
                </motion.div>
            </section>

            {/* --- LEVELS HORIZONTAL OVERVIEW --- */}
            <div className="max-w-5xl mx-auto px-6 py-16">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-20%" }}
                    className="text-center mb-10"
                >
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
                        3-Level System <span className="text-slate-300 font-light">Mastery</span>
                    </h2>
                    <p className="text-slate-500">단계별로 힌트가 줄어들며, 실력이 올라갑니다.</p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-slate-200 dark:bg-white/10 rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-sm">
                    {LEVELS.map((lvl, idx) => (
                        <motion.div
                            key={lvl.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-white dark:bg-slate-900 p-8 md:p-10 relative group hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            <span className={`block text-[10px] font-black tracking-[0.3em] uppercase mb-4 ${lvl.color === 'slate' ? 'text-slate-400' : lvl.color === 'yellow' ? 'text-yellow-500' : 'text-amber-500'}`}>
                                Level {idx + 1}
                            </span>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-3">
                                {lvl.name}
                            </h3>
                            <p className="text-sm font-medium text-slate-500 leading-relaxed">
                                {lvl.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* --- HORIZONTAL SCROLL THEMES --- */}
            {WRITING_THEMES.map((theme, idx) => (
                <ThemeScrollSection key={theme.id} theme={theme} index={idx} onSessionClick={handleSessionClick} />
            ))}

            {/* Level Selection Modal */}
            <AnimatePresence>
                {showLevelSelect && pendingSession && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowLevelSelect(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 16 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 md:p-10 max-w-md w-full shadow-2xl border border-transparent dark:border-white/10"
                        >
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">난이도 선택</h3>
                            <p className="text-sm text-slate-500 mb-8 font-medium">
                                <span className="text-slate-800 dark:text-white font-bold">{pendingSession.session.title}</span> 학습을 시작합니다.
                            </p>

                            <div className="space-y-3 mb-8">
                                {LEVELS.map((lvl, idx) => (
                                    <button
                                        key={lvl.id}
                                        onClick={() => setSelectedLevel(lvl.id)}
                                        className={`w-full flex items-center gap-5 p-5 rounded-2xl border-2 transition-all duration-200 text-left ${selectedLevel === lvl.id
                                            ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800'
                                            : 'border-slate-100 dark:border-white/10 hover:border-slate-200 dark:hover:border-white/20'
                                            }`}
                                    >
                                        <span className="text-xs font-black text-slate-300 tabular-nums">0{idx + 1}</span>
                                        <div className="flex-1">
                                            <div className="font-bold text-slate-900 dark:text-white text-base">{lvl.name}</div>
                                            <div className="text-xs text-slate-500 mt-1 line-clamp-1">{lvl.description}</div>
                                        </div>
                                        {selectedLevel === lvl.id && (
                                            <div className="w-5 h-5 rounded-full bg-slate-900 dark:bg-white flex items-center justify-center">
                                                <svg className="w-3 h-3 text-white dark:text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Grade Selector */}
                            <div className="mb-8">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">학년 난이도 (어휘/문장 수준)</h4>
                                <div className="flex flex-wrap gap-2">
                                    {GRADES.map(g => (
                                        <button
                                            key={g.value}
                                            onClick={() => setSelectedGrade(g.value)}
                                            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${selectedGrade === g.value
                                                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700'
                                                }`}
                                        >
                                            {g.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleStartSession}
                                className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold text-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-xl shadow-slate-900/10"
                            >
                                학습 시작
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Footer */}
            <div className="py-16 text-center text-slate-400 text-xs font-bold tracking-[0.2em] uppercase bg-slate-900">
                Designed for Cheonghan English
            </div>
        </div>
    );
}
