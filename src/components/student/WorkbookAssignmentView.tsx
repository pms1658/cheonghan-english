'use client';

import { useState, useEffect, useRef } from 'react';
import { Assignment, Submission, WorkbookConfig, WorkbookLevelType } from '@/types';
import { dbService } from '@/services/db';
import { useWorkbookLogic } from '@/hooks/useWorkbookLogic';
import { motion, AnimatePresence } from 'framer-motion';

interface WorkbookAssignmentViewProps {
    assignment: Assignment;
    studentId: string;
    studentName: string;
    onComplete: () => void;
}

export default function WorkbookAssignmentView({
    assignment,
    studentId,
    studentName,
    onComplete
}: WorkbookAssignmentViewProps) {
    // Use Custom Hook for Logic
    const config = assignment.workbookConfig as WorkbookConfig;
    const levels = config.levels;

    const {
        currentLevelIdx, setCurrentLevelIdx,
        answers, setAnswers,
        completedLevels, setCompletedLevels,
        isLoading, isSubmitting,
        retryMode, setRetryMode,
        failedIndices, setFailedIndices,
        showCelebration, setShowCelebration,
        showFailedModal, setShowFailedModal,
        failedResult,
        showFlowModal, setShowFlowModal,
        writingState, setWritingState,
        unscrambleState, setUnscrambleState,
        handleLevelComplete,
        finalizeSubmission,
        handleWordSelect,
        moveToAvailable,
        moveToSelected,
        checkUnscramble,
        handleWritingChange,
        currentLevel,
        existingHistory,
        shuffledProblems,
        levelHints
    } = useWorkbookLogic({
        assignment,
        levels,
        studentId,
        studentName,
        onComplete
    });

    // Print function
    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const levelLabels: Record<string, string> = { vocab: '1단계: 어휘', grammar: '2단계: 어법', mastery: '3단계: 구문 완성' };

        let problemsHtml = '';
        levels.forEach((level, levelIdx) => {
            const label = levelLabels[level.type] || `${levelIdx + 1}단계`;
            problemsHtml += `<div class="level-section"><h3>${label}</h3>`;
            level.problems.forEach((prob: any, pIdx: number) => {
                const probLabel = String.fromCharCode(65 + pIdx);
                const style = level.type === 'mastery' ? prob.style : level.type;

                if (style === 'vocab' || style === 'grammar') {
                    problemsHtml += `<div class="problem">
                        <div class="problem-num">${probLabel}</div>
                        <div class="problem-content">
                            <p class="question">${prob.question}</p>
                            <div class="choices">${(prob.choices || []).map((c: string, i: number) => `<span class="choice">${i + 1}. ${c}</span>`).join('')}</div>
                        </div>
                    </div>`;
                } else if (style === 'unscramble') {
                    const segments = (prob.segments || prob.answer?.split(' ') || []).sort(() => Math.random() - 0.5);
                    problemsHtml += `<div class="problem">
                        <div class="problem-num">${probLabel}</div>
                        <div class="problem-content">
                            <p class="korean">${prob.korean || ''}</p>
                            <div class="word-bank">${segments.map((w: string) => `<span class="word-chip">${w}</span>`).join('')}</div>
                            <div class="answer-line"></div>
                        </div>
                    </div>`;
                } else if (style === 'writing') {
                    const skeleton = (prob.skeleton || '').replace(/\[.*?\]/g, '<span class="blank">________</span>');
                    problemsHtml += `<div class="problem">
                        <div class="problem-num">${probLabel}</div>
                        <div class="problem-content">
                            <p class="korean">${prob.korean || ''}</p>
                            <div class="word-bank">${(prob.hints || []).map((h: string) => `<span class="word-chip">${h}</span>`).join('')}</div>
                            <p class="skeleton">${skeleton}</p>
                        </div>
                    </div>`;
                }
            });
            problemsHtml += '</div>';
        });

        printWindow.document.write(`<!DOCTYPE html><html><head><title>${assignment.title} - 워크북</title><style>
            @page { margin: 15mm; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; color: #1d1d1f; line-height: 1.6; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0A0E27; padding-bottom: 12px; margin-bottom: 20px; }
            .header h1 { font-size: 18px; font-weight: 900; }
            .header .meta { font-size: 10px; color: #86868b; }
            .passage-box { background: #f5f5f7; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px; font-size: 13px; line-height: 1.8; text-align: justify; }
            .level-section { margin-bottom: 24px; page-break-inside: avoid; }
            .level-section h3 { font-size: 14px; font-weight: 900; color: #0A0E27; border-bottom: 2px solid #e5e5ea; padding-bottom: 6px; margin-bottom: 12px; }
            .problem { display: flex; gap: 10px; margin-bottom: 14px; }
            .problem-num { width: 24px; height: 24px; border-radius: 6px; background: #f5f5f7; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 11px; color: #6e6e73; flex-shrink: 0; }
            .problem-content { flex: 1; }
            .question { font-size: 13px; font-weight: 600; margin-bottom: 6px; }
            .choices { display: flex; flex-wrap: wrap; gap: 8px 16px; }
            .choice { font-size: 12px; padding: 2px 8px; border: 1px solid #e5e5ea; border-radius: 6px; }
            .korean { font-size: 13px; font-weight: 700; color: #1d1d1f; margin-bottom: 8px; }
            .word-bank { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
            .word-chip { font-size: 11px; padding: 2px 8px; background: #f5f5f7; border: 1px solid #e5e5ea; border-radius: 4px; font-weight: 600; }
            .answer-line { border-bottom: 1.5px solid #c7c7cc; height: 28px; margin-top: 4px; }
            .skeleton { font-size: 13px; line-height: 2; }
            .blank { display: inline-block; border-bottom: 1.5px solid #1d1d1f; width: 60px; text-align: center; margin: 0 2px; }
        </style></head><body>
            <div class="header">
                <div><h1>${assignment.title}</h1><div class="meta">${studentName || ''} · 워크북</div></div>
            </div>
            <div class="passage-box">${config.passage.split('\n').filter(p => p.trim()).map(p => `<p>${p}</p>`).join('')}</div>
            ${problemsHtml}
        </body></html>`);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 300);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-4 animate-fadeIn pb-20">
            {/* Celebration Popup */}
            {showCelebration && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-fadeIn">
                    <div className="bg-white dark:bg-slate-900 rounded-[32px] p-10 text-center shadow-2xl scale-110 transform transition-all border-4 border-yellow-400 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 animate-shimmer"></div>
                        <span className="text-7xl mb-4 block">👑</span>
                        <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2">GRAND MASTER</h2>
                        <p className="text-slate-500 dark:text-slate-400 font-bold mb-6">모든 심화 단계(영작)를 정복하셨습니다!<br />대시보드에 황금 왕관이 부여됩니다.</p>
                        <button
                            onClick={() => { setShowCelebration(false); onComplete(); }}
                            className="px-10 py-4 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-2xl font-black shadow-lg hover:scale-105 transition-transform"
                        >
                            확인
                        </button>
                    </div>
                </div>
            )}

            {/* Failed Modal */}
            {showFailedModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-rose-950/80 backdrop-blur-md animate-fadeIn">
                    <div className="bg-white dark:bg-slate-900 rounded-[32px] p-10 text-center shadow-2xl scale-110 transform transition-all max-w-sm w-full mx-4 border border-rose-100 dark:border-rose-900">
                        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">문제풀이 결과</h2>
                        <p className="text-slate-500 dark:text-slate-400 font-bold mb-8">
                            {failedResult ? `${failedResult.total}문제 중 ${failedResult.correct}문제를 맞혔습니다.` : '오답이 있습니다.'}
                            <br />완벽하게 이해할 때까지 도전해봐요!
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => {
                                    setShowFailedModal(false);
                                    setRetryMode(true);

                                    // Reset state for failed problems only
                                    setAnswers(prev => {
                                        const next = { ...prev };
                                        failedIndices.forEach(idx => {
                                            delete next[`${currentLevelIdx}-${idx}`];
                                        });
                                        return next;
                                    });

                                    // Clear writing inputs for failed problems
                                    setWritingState(prev => {
                                        const next = { ...prev };
                                        failedIndices.forEach(idx => {
                                            // Reset to empty strings preserving array length
                                            if (next[`${currentLevelIdx}-${idx}`]) {
                                                next[`${currentLevelIdx}-${idx}`] = next[`${currentLevelIdx}-${idx}`].map(() => '');
                                            }
                                        });
                                        return next;
                                    });

                                    // Reset unscramble selection for failed problems
                                    setUnscrambleState(prev => {
                                        const next = { ...prev };
                                        failedIndices.forEach(idx => {
                                            const key = `${currentLevelIdx}-${idx}`;
                                            if (next[key]) {
                                                // Move selected back to available and shuffle
                                                const allWords = [...next[key].available, ...next[key].selected];
                                                next[key] = {
                                                    available: allWords.sort(() => Math.random() - 0.5),
                                                    selected: []
                                                };
                                            }
                                        });
                                        return next;
                                    });

                                    window.scrollTo(0, 0);
                                }}
                                className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black shadow-lg shadow-rose-100 hover:scale-[1.02] transition-transform"
                            >
                                틀린 문제 다시 풀기
                            </button>
                            <button
                                onClick={() => {
                                    setShowFailedModal(false);
                                    onComplete();
                                }}
                                className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-colors"
                            >
                                학습 종료 (나가기)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Flow Choice Modal (After Level 2) */}
            {showFlowModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-indigo-950/80 backdrop-blur-md animate-fadeIn">
                    <div className="bg-white dark:bg-slate-900 rounded-[32px] p-10 text-center shadow-2xl scale-110 transform transition-all max-w-sm w-full mx-4 border border-indigo-100 dark:border-indigo-900">
                        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">핵심 단계 완료!</h2>
                        <p className="text-slate-500 dark:text-slate-400 font-bold mb-8">어휘 · 어법 학습을 모두 마쳤습니다!<br />3단계(어순배열 · 영작)에 도전하시겠습니까?</p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={async () => {
                                    setShowFlowModal(false);
                                    const newCompleted = [...new Set([...completedLevels, 1, 2])];
                                    setCompletedLevels(newCompleted);
                                    await finalizeSubmission(newCompleted);
                                    onComplete();
                                }}
                                className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-colors"
                            >
                                PASS 받기 (여기까지 학습)
                            </button>
                            <button
                                onClick={async () => {
                                    setShowFlowModal(false);
                                    const newCompleted = [...new Set([...completedLevels, 1, 2])];
                                    setCompletedLevels(newCompleted);

                                    // Save "Passed" state silently before entering Mastery
                                    // This ensures they get credit for Core even if they fail Mastery later.
                                    await finalizeSubmission(newCompleted, true);

                                    setCurrentLevelIdx(prev => prev + 1);
                                }}
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:scale-[1.02] transition-transform"
                            >
                                🎯 완료 목표로 3단계 도전!
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Navy Header — Unified Design */}
            <div className="sticky top-0 z-40 bg-[#0A0E27] px-4 py-4 shadow-xl relative overflow-hidden rounded-b-[24px]" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl -ml-24 -mb-24"></div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-xl text-[9px] font-black uppercase tracking-widest border border-indigo-400/30">WORKBOOK STEP {currentLevelIdx + 1}</span>
                            {currentLevelIdx >= 2 && (
                                <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-xl text-[9px] font-black uppercase tracking-widest border border-amber-400/30">MASTERY</span>
                            )}
                        </div>
                        <h2 className="text-lg font-bold text-white tracking-tight leading-tight">
                            {assignment.title}
                        </h2>
                        <p className="text-slate-400 text-xs font-medium mt-0.5">
                            {currentLevel.type === 'vocab' ? '1단계: 핵심 어휘 선택' :
                                currentLevel.type === 'grammar' ? '2단계: 핵심 어법 선택' :
                                    '3단계: Mastery (구문 완성)'}
                        </p>
                    </div>
                    <div className="w-full md:w-auto text-right">
                        <div className="flex flex-col gap-2 items-end">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handlePrint}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-lg text-xs font-bold transition-all border border-white/10"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                                    인쇄
                                </button>
                                <button
                                    onClick={onComplete}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-lg text-xs font-bold transition-all border border-white/10"
                                >
                                    나가기
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                                </button>
                            </div>
                            <div className="flex flex-col gap-1 w-full">
                                <div className="flex justify-between items-end mb-0.5">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">워크북 진행률</p>
                                    <span className="text-xl font-black text-indigo-300 tabular-nums">{Math.round(((currentLevelIdx + 1) / levels.length) * 100)}%</span>
                                </div>
                                <div className="w-full md:w-40 h-3 bg-white/10 rounded-full p-0.5 border border-white/10">
                                    <div
                                        className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                                        style={{ width: `${((currentLevelIdx + 1) / levels.length) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Level Navigation Bullets */}
                <div className="flex gap-2 mt-4 relative z-10">
                    {levels.map((_, i) => (
                        <div
                            key={i}
                            className={`flex-1 h-2 rounded-xl transition-all duration-700 relative ${i === currentLevelIdx ? 'bg-indigo-400 ring-4 ring-indigo-500/20 shadow-md shadow-indigo-400/30' :
                                i < currentLevelIdx ? 'bg-emerald-400' : 'bg-white/10'
                                }`}
                        >
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <AnimatePresence mode="wait" initial={false}>
            <motion.div
                key={`wb-level-${currentLevelIdx}`}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
            <div className="space-y-6">
                {/* Reference Passage Area - Only for Vocab (L1) & Grammar (L2) */}
                {(currentLevel.type === 'vocab' || currentLevel.type === 'grammar') && (
                    <div className="bg-slate-50/50 dark:bg-slate-800/50 rounded-[24px] p-6 md:p-8 border border-slate-200/60 dark:border-white/10 shadow-inner group overflow-hidden">
                        <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Reference Passage</span>
                        </div>

                        <div className="font-serif leading-relaxed text-lg text-slate-700 dark:text-slate-300 space-y-4">
                            {(() => {
                                const assignedProblems = new Set<number>();
                                return config.passage.split('\n').filter(p => p.trim()).map((para, paraIdx) => {
                                    let fragments: (string | JSX.Element)[] = [para];

                                    currentLevel.problems.forEach((prob: any, pIdx: number) => {
                                        if (assignedProblems.has(pIdx)) return; // Already placed in specific paragraph

                                        const label = String.fromCharCode(65 + pIdx);
                                        const searchStr = (currentLevel.type === 'unscramble' || currentLevel.type === 'writing') ? prob.original : prob.answer;
                                        if (!searchStr) return;

                                        for (let i = 0; i < fragments.length; i++) {
                                            if (typeof fragments[i] !== 'string') continue;

                                            const text = fragments[i] as string;
                                            const startPos = text.indexOf(searchStr);

                                            if (startPos !== -1) {
                                                const before = text.slice(0, startPos);
                                                const after = text.slice(startPos + searchStr.length);
                                                const blank = (
                                                    <span key={`blank-${paraIdx}-${pIdx}`} className="inline-flex items-center justify-center px-4 py-1 bg-indigo-600 text-white rounded-lg font-black text-sm mx-1.5 shadow-sm align-middle">
                                                        ({label})
                                                    </span>
                                                );
                                                fragments.splice(i, 1, before, blank, after);
                                                assignedProblems.add(pIdx); // Mark as assigned
                                                break;
                                            }
                                        }
                                    });
                                    return <p key={paraIdx} className="text-justify leading-relaxed">{fragments}</p>;
                                });
                            })()}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-2">
                    {/* Problem Mapping with Retry Filtering */}
                    {(currentLevel.type === 'vocab' || currentLevel.type === 'grammar' ? shuffledProblems : currentLevel.problems)
                        .map((prob: any, pIdx: number) => {
                            if (retryMode && !failedIndices.includes(pIdx)) return null;

                            const problemKey = `${currentLevelIdx}-${pIdx}`;
                            const isAnswered = !!answers[problemKey];

                            // Determine Problem Type (Support mixed Mastery level)
                            const probType = currentLevel.type === 'mastery' ? prob.style : currentLevel.type;

                            return (
                                <div key={pIdx} className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg rounded-[16px] p-4 shadow-md border border-white/50 dark:border-white/10 hover:border-indigo-200 transition-all group/card relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16 group/card:hover:bg-indigo-500/10 transition-colors"></div>
                                    <div className="flex gap-4 items-start relative z-10">
                                        <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center text-base font-black transition-all shadow-sm shrink-0 ${isAnswered ? 'bg-emerald-500 text-white' : 'bg-white text-slate-300 border border-slate-100 group-hover/card:bg-indigo-600 group-hover/card:text-white group-hover/card:border-indigo-600'}`}>
                                            {String.fromCharCode(65 + pIdx)}
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            {(probType === 'unscramble' || probType === 'writing') && (prob.korean || prob.translation) && (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1 h-3.5 bg-indigo-400 rounded-full"></div>
                                                    <p className="text-base font-black text-slate-800 dark:text-white tracking-tight leading-tight">{prob.korean || prob.translation}</p>
                                                </div>
                                            )}

                                            {(probType === 'vocab' || probType === 'grammar') ? (
                                                <div className="space-y-3">
                                                    {prob.question && (
                                                        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">{prob.question}</p>
                                                    )}
                                                    <div className="flex flex-wrap gap-2">
                                                        {(prob.shuffledChoices || prob.choices || []).map((choice: string, cIdx: number) => {
                                                            const selected = answers[problemKey];
                                                            const isCorrect = choice === prob.answer;

                                                            let buttonClass = "px-4 py-1.5 rounded-lg border font-black text-sm transition-all flex items-center gap-2 group/btn ";
                                                            if (selected) {
                                                                if (choice === selected) {
                                                                    buttonClass += isCorrect ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm " : "bg-rose-50 border-rose-500 text-rose-800 shadow-sm ";
                                                                } else if (isCorrect) {
                                                                    buttonClass += "border-emerald-200 text-emerald-600 border-dashed opacity-80 ";
                                                                } else {
                                                                    buttonClass += "border-slate-100 text-slate-300 opacity-30 grayscale ";
                                                                }
                                                            } else {
                                                                buttonClass += "bg-white border-slate-50 text-slate-600 hover:border-indigo-500 hover:text-indigo-600 hover:shadow-sm ";
                                                            }

                                                            return (
                                                                <button key={cIdx} disabled={isAnswered} onClick={() => setAnswers(prev => ({ ...prev, [problemKey]: choice }))} className={buttonClass}>
                                                                    <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black transition-colors ${selected && (choice === selected) ? (isCorrect ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white') : 'bg-slate-100 text-slate-400 group-hover/btn:bg-indigo-600 group-hover/btn:text-white'}`}>
                                                                        {cIdx + 1}
                                                                    </span>
                                                                    {choice}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>

                                                    {isAnswered && prob.explanation && (
                                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-500 leading-normal animate-slideInLeft">
                                                            <div className="font-black text-indigo-600 mb-1 flex items-center gap-1 uppercase tracking-tighter">
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                Feedback
                                                            </div>
                                                            <span dangerouslySetInnerHTML={{ __html: prob.explanation }} />
                                                        </div>
                                                    )}
                                                </div>
                                            ) : probType === 'unscramble' ? (
                                                <div className="space-y-3">
                                                    <div className="space-y-2">
                                                        <div className={`min-h-[44px] p-2.5 bg-slate-50/50 rounded-xl border-2 border-dashed transition-all flex flex-wrap gap-1.5 items-center ${isAnswered ? 'border-emerald-200 bg-emerald-50/20' : 'border-indigo-100'}`}>
                                                            {unscrambleState[problemKey]?.selected.length === 0 && <span className="text-[10px] font-bold text-slate-300 ml-2 uppercase tracking-widest italic">단어를 선택하세요</span>}
                                                            {(unscrambleState[problemKey]?.selected || []).map((word, wIdx) => (
                                                                <button
                                                                    key={wIdx}
                                                                    disabled={isAnswered}
                                                                    onClick={() => moveToAvailable(problemKey, word, wIdx)}
                                                                    className={`px-3 py-1 rounded-lg text-sm font-black shadow-sm transition-all ${isAnswered ? 'bg-white border border-emerald-500 text-emerald-600' : 'bg-indigo-600 text-white hover:bg-rose-500'}`}
                                                                >
                                                                    {word}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <div className="flex flex-wrap gap-1.5 p-2 bg-slate-100/30 rounded-lg border border-slate-100 min-h-[40px]">
                                                            {(unscrambleState[problemKey]?.available || []).map((word, wIdx) => (
                                                                <button
                                                                    key={wIdx}
                                                                    disabled={isAnswered}
                                                                    onClick={() => moveToSelected(problemKey, word, wIdx)}
                                                                    className="px-3 py-1 bg-white rounded-lg text-sm font-bold border border-slate-100 text-slate-600 hover:border-indigo-400 transition-all opacity-80 hover:opacity-100 disabled:opacity-20"
                                                                >
                                                                    {word}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-end gap-2">
                                                        {!isAnswered && (
                                                            <button
                                                                onClick={() => {
                                                                    const state = unscrambleState[problemKey];
                                                                    setUnscrambleState(prev => ({
                                                                        ...prev,
                                                                        [problemKey]: { available: [...state.available, ...state.selected].sort(() => Math.random() - 0.5), selected: [] }
                                                                    }));
                                                                }}
                                                                className="px-4 py-1.5 text-slate-400 font-bold hover:text-slate-600 transition-colors text-[10px]"
                                                            >
                                                                초기화
                                                            </button>
                                                        )}
                                                        <button
                                                            disabled={isAnswered || unscrambleState[problemKey]?.selected.length === 0}
                                                            onClick={() => checkUnscramble(problemKey, prob)}
                                                            className={`px-6 py-1.5 rounded-lg font-black shadow-md transition-all text-xs ${isAnswered ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                                                        >
                                                            {isAnswered ? '확인됨' : '정답 확인'}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <div className="p-2 bg-slate-100/30 rounded-lg border border-slate-200/50 flex flex-wrap gap-2 justify-center items-center">
                                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mr-1 opacity-50">WORD BANK:</span>
                                                        {(levelHints[problemKey] || prob.hints || []).map((hint: string, hIdx: number) => (
                                                            <span key={hIdx} className="px-2 py-0.5 bg-white rounded-md text-[10px] font-bold text-slate-500 border border-slate-100 shadow-sm">{hint}</span>
                                                        ))}
                                                    </div>

                                                    <div className="flex flex-wrap gap-x-1 gap-y-2.5 p-4 bg-slate-50/30 rounded-xl border border-slate-100 leading-normal font-sans text-sm text-slate-700">
                                                        {(prob.skeleton || '').split(/(\[.*?\])/).map((segment: string, sIdx: number) => {
                                                            if (segment.startsWith('[') && segment.endsWith(']')) {
                                                                const blankIdx = (prob.skeleton || '').split(/(\[.*?\])/).filter((s: string, i: number) => i < sIdx && s.startsWith('[')).length;
                                                                const currentVal = writingState[problemKey]?.[blankIdx] || '';

                                                                // Use strict tokenizedAnswers if available (new logic), otherwise fallback to hints index (legacy)
                                                                const targetAnswer = prob.tokenizedAnswers?.[blankIdx] || prob.hints?.[blankIdx] || '';
                                                                const isCorrect = currentVal.toLowerCase().trim() === targetAnswer.toLowerCase().trim();

                                                                return (
                                                                    <div key={sIdx} className="inline-flex align-middle">
                                                                        <input
                                                                            type="text"
                                                                            value={currentVal}
                                                                            disabled={isAnswered}
                                                                            onChange={(e) => handleWritingChange(problemKey, blankIdx, e.target.value)}
                                                                            className={`w-20 h-7 bg-white rounded-md border outline-none px-1.5 text-center transition-all ${isAnswered ? (isCorrect ? 'border-emerald-500 text-emerald-600' : 'border-rose-300 text-rose-500') : 'border-slate-200 text-indigo-700 focus:border-blue-400 shadow-sm'}`}
                                                                            style={{ fontFamily: "'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif", fontWeight: 800 }}
                                                                            spellCheck={false}
                                                                        />
                                                                    </div>
                                                                );
                                                            }
                                                            return <span key={sIdx} className="opacity-70 font-semibold">{segment}</span>;
                                                        })}
                                                    </div>
                                                    <div className="text-right">
                                                        <button
                                                            disabled={isAnswered}
                                                            onClick={() => {
                                                                setAnswers(prev => ({ ...prev, [problemKey]: (writingState[problemKey] || []).join(',') }));
                                                            }}
                                                            className={`px-6 py-1.5 rounded-lg font-black shadow-md transition-all text-xs ${isAnswered ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                                                        >
                                                            {isAnswered ? '확인됨' : '채점하기'}
                                                        </button>
                                                    </div>
                                                    {/* Explanations / Feedback */}
                                                    {isAnswered && (
                                                        <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200/60 animate-fadeIn">
                                                            <div className="flex items-start gap-3">
                                                                <div className="mt-0.5 min-w-[20px]">
                                                                    <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <div className="text-sm font-bold text-slate-700">
                                                                        <span className="text-indigo-600 mr-2">[정답/해설]</span>
                                                                        <span dangerouslySetInnerHTML={{ __html: prob.explanation || '제공된 해설이 없습니다.' }} />
                                                                    </div>
                                                                    <div className="text-xs text-slate-500 font-medium bg-white px-3 py-2 rounded-lg border border-slate-200 inline-block">
                                                                        정답 문장: <span className="text-emerald-600 font-bold">{prob.answer}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                </div>
            </div>
            </motion.div>
            </AnimatePresence>

            <div className="flex justify-center pt-6">
                <button
                    onClick={handleLevelComplete}
                    disabled={isSubmitting}
                    className="px-12 py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-blue-50 hover:-translate-y-0.5 transition-all disabled:opacity-50 flex items-center gap-4 text-base"
                >
                    {isSubmitting ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>저장 중...</span>
                        </>
                    ) : (
                        <>
                            <span>{currentLevelIdx === levels.length - 1 ? '워크북 완료 ✨' : '다음 단계로 가기'}</span>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                        </>
                    )}
                </button>
            </div>
        </div >
    );
}
