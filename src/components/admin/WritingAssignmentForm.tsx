'use client';

import React, { useState, useEffect } from 'react';
import { WRITING_THEMES, LEVELS, GRADES, ALL_SESSIONS, getSessionById, getThemeById, WritingLevel, TargetGrade } from '@/data/writingModules';
import { Class, Assignment } from '@/types';
import { dbService } from '@/services/db';
import ClassSelector from './ClassSelector';
import { toast } from 'sonner';

interface WritingAssignmentFormProps {
    selectedClass: Class | null;
    initialData?: Assignment | null;
    onBack: () => void;
    onSave: (data: any) => void;
}

export default function WritingAssignmentForm({ selectedClass, initialData, onBack, onSave }: WritingAssignmentFormProps) {
    const existingConfig = initialData?.writingConfig;

    const [title, setTitle] = useState(initialData?.title || '');
    const [selectedSessionId, setSelectedSessionId] = useState<number | null>(existingConfig?.sessionId || null);
    const [level, setLevel] = useState<WritingLevel>(existingConfig?.level || 'bronze');
    const [targetGrade, setTargetGrade] = useState<TargetGrade>((existingConfig?.targetGrade as TargetGrade) || '2');
    const [problemCount, setProblemCount] = useState(existingConfig?.problemCount || 5);
    const [expandedTheme, setExpandedTheme] = useState<number | null>(null);

    // Classes for distribution
    const [availableClasses, setAvailableClasses] = useState<{id: string; name: string}[]>([]);
    const [selectedClassIds, setSelectedClassIds] = useState<string[]>(selectedClass ? [selectedClass.id] : (initialData?.classIds || []));

    useEffect(() => {
        const loadClasses = async () => {
            try {
                const cls = await dbService.getClasses();
                setAvailableClasses(cls.map(c => ({ id: c.id, name: c.name })));
            } catch (e) { console.error(e); }
        };
        loadClasses();
    }, []);

    const selectedSession = selectedSessionId ? getSessionById(selectedSessionId) : null;
    const selectedTheme = selectedSession ? getThemeById(selectedSession.themeId) : null;

    const handleSessionSelect = (sessionId: number) => {
        setSelectedSessionId(sessionId);
        const session = getSessionById(sessionId);
        if (session && !title) {
            const levelLabel = LEVELS.find(l => l.id === level)?.nameKo || level;
            setTitle(`${session.title} - ${levelLabel}`);
        }
    };

    const handleSave = () => {
        if (!title.trim()) { toast.warning("과제 제목을 입력해주세요."); return; }
        if (!selectedSessionId) { toast.warning("작문 구문을 선택해주세요."); return; }

        const classIds = selectedClassIds.length > 0 ? selectedClassIds : (selectedClass ? [selectedClass.id] : (initialData?.classIds || []));

        onSave({
            title: title.trim(),
            type: 'writing',
            classIds,
            sentences: [],
            content: '',
            deadline: '',
            writingConfig: {
                sessionId: selectedSessionId,
                level,
                targetGrade,
                problemCount,
            },
        });
    };

    return (
        <div className="max-w-4xl mx-auto p-6 md:p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                    </button>
                    <div>
                        <h2 className="text-xl font-black text-slate-900">✍️ 구조작문 과제</h2>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">
                            {selectedClass ? selectedClass.name : '클래스 미선택'} · AI 문제 자동 생성
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={!title.trim() || !selectedSessionId}
                    className="px-6 py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg"
                >
                    저장하기
                </button>
            </div>

            <div className="space-y-8">
                {/* Title */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">과제 제목</label>
                    <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="예: 가주어·진주어 영작 - 기본"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 outline-none transition-all"
                    />
                </div>

                {/* Class Selector */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                    <ClassSelector
                        classes={availableClasses}
                        selectedClassIds={selectedClassIds}
                        onChange={setSelectedClassIds}
                    />
                </div>

                {/* Session Selection */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">작문 구문 선택</label>

                    {selectedSession && selectedTheme && (
                        <div className="mb-4 p-4 rounded-xl border-2 border-slate-900 bg-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs text-white shadow-sm"
                                    style={{ backgroundColor: selectedTheme.accentHex }}>
                                    {selectedSession.id}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold text-slate-900">{selectedSession.title}</div>
                                    <div className="text-[10px] text-slate-400 font-medium">{selectedTheme.icon} {selectedTheme.name} · {selectedSession.titleEn}</div>
                                </div>
                                <button onClick={() => setSelectedSessionId(null)} className="text-xs text-slate-400 hover:text-red-500 font-bold">변경</button>
                            </div>
                            <div className="mt-2 px-3 py-2 bg-white rounded-lg">
                                <code className="text-[11px] font-mono text-slate-600 font-bold">{selectedSession.formula}</code>
                            </div>
                        </div>
                    )}

                    {!selectedSession && (
                        <div className="space-y-2">
                            {WRITING_THEMES.map(theme => (
                                <div key={theme.id} className="border border-slate-100 rounded-xl overflow-hidden">
                                    <button
                                        onClick={() => setExpandedTheme(expandedTheme === theme.id ? null : theme.id)}
                                        className="w-full flex items-center gap-3 p-3.5 hover:bg-slate-50 transition-colors text-left"
                                    >
                                        <span className="text-xl">{theme.icon}</span>
                                        <div className="flex-1">
                                            <span className="text-sm font-bold text-slate-800">{theme.name}</span>
                                            <span className="text-[10px] text-slate-400 ml-2 font-medium">{theme.sessions.length} sessions</span>
                                        </div>
                                        <svg className={`w-4 h-4 text-slate-400 transition-transform ${expandedTheme === theme.id ? 'rotate-180' : ''}`}
                                            fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                        </svg>
                                    </button>

                                    {expandedTheme === theme.id && (
                                        <div className="px-3 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {theme.sessions.map(session => (
                                                <button
                                                    key={session.id}
                                                    onClick={() => handleSessionSelect(session.id)}
                                                    className="text-left p-3 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all group"
                                                >
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black text-white"
                                                            style={{ backgroundColor: theme.accentHex }}>
                                                            {session.id}
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-700">{session.title}</span>
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 font-medium truncate">{session.formula}</div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Level & Grade Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Level */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">난이도 레벨</label>
                        <div className="space-y-2">
                            {LEVELS.map(lvl => (
                                <button
                                    key={lvl.id}
                                    onClick={() => setLevel(lvl.id)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                                        level === lvl.id
                                            ? 'border-slate-900 bg-slate-50 shadow-sm'
                                            : 'border-slate-100 hover:border-slate-200'
                                    }`}
                                >
                                    <span className="text-2xl">{lvl.icon}</span>
                                    <div className="flex-1">
                                        <div className="text-sm font-bold text-slate-900">{lvl.name} <span className="text-slate-400 font-medium text-xs">({lvl.nameKo})</span></div>
                                        <div className="text-[10px] text-slate-500">{lvl.description}</div>
                                    </div>
                                    {level === lvl.id && (
                                        <div className="w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center">
                                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Grade + Problem Count */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">학년 (어휘·문장 난이도)</label>
                            <div className="flex flex-wrap gap-2">
                                {GRADES.map(g => (
                                    <button
                                        key={g.value}
                                        onClick={() => setTargetGrade(g.value)}
                                        className={`px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                                            targetGrade === g.value
                                                ? 'border-slate-900 bg-slate-900 text-white'
                                                : 'border-slate-100 text-slate-500 hover:border-slate-200'
                                        }`}
                                    >
                                        {g.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">문제 개수</label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    min={1}
                                    max={15}
                                    value={problemCount}
                                    onChange={e => setProblemCount(Math.max(1, Math.min(15, parseInt(e.target.value) || 5)))}
                                    className="w-20 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm font-bold text-slate-900 focus:ring-2 focus:ring-slate-900/20 outline-none"
                                />
                                <span className="text-sm text-slate-400 font-medium">문제 (1~15)</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Preview Info */}
                {selectedSession && (
                    <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">📋 과제 미리보기</h4>
                        <div className="space-y-2 text-sm text-slate-600">
                            <div><span className="font-bold text-slate-700">구문:</span> {selectedSession.title} ({selectedSession.titleEn})</div>
                            <div><span className="font-bold text-slate-700">설명:</span> {selectedSession.description}</div>
                            <div><span className="font-bold text-slate-700">레벨:</span> {LEVELS.find(l => l.id === level)?.icon} {LEVELS.find(l => l.id === level)?.name} — {LEVELS.find(l => l.id === level)?.description}</div>
                            <div><span className="font-bold text-slate-700">학년:</span> {GRADES.find(g => g.value === targetGrade)?.label} ({GRADES.find(g => g.value === targetGrade)?.description})</div>
                            <div><span className="font-bold text-slate-700">문제수:</span> {problemCount}문제</div>
                            <div><span className="font-bold text-slate-700">통과:</span> 평균 90점 이상</div>
                        </div>
                        <div className="mt-4 p-3 bg-white rounded-xl border border-slate-200">
                            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">예시</div>
                            <div className="text-xs text-slate-600">🇰🇷 {selectedSession.exampleKo}</div>
                            <div className="text-xs font-bold mt-1" style={{ color: selectedTheme?.accentHex }}>🇬🇧 {selectedSession.exampleEn}</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
