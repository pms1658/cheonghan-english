'use client';

import React, { useState, useRef } from 'react';
import { StudentReport } from '@/types';
import {
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface ReportViewProps {
    report: StudentReport;
    onPublish?: () => void;
    onDelete?: () => void;
    isAdmin?: boolean;
}

export default function ReportView({ report, onPublish, onDelete, isAdmin }: ReportViewProps) {
    const [showAiSummary, setShowAiSummary] = useState(true);
    const printRef = useRef<HTMLDivElement>(null);

    const radarData = [
        { subject: '어휘', score: report.vocabScore, fullMark: 100 },
        { subject: '문법', score: report.grammarScore, fullMark: 100 },
        { subject: '독해', score: report.readingScore, fullMark: 100 },
    ];

    const overallScore = Math.round((report.vocabScore + report.grammarScore + report.readingScore) / 3);

    const trendIcon = (t: 'up' | 'stable' | 'down') =>
        t === 'up' ? '📈' : t === 'stable' ? '➡️' : '📉';
    const trendColor = (t: 'up' | 'stable' | 'down') =>
        t === 'up' ? 'text-emerald-600' : t === 'stable' ? 'text-slate-500' : 'text-red-500';
    const trendLabel = (t: 'up' | 'stable' | 'down') =>
        t === 'up' ? '상승' : t === 'stable' ? '유지' : '하락';

    const scoreColor = (s: number) =>
        s >= 80 ? 'text-emerald-600' : s >= 60 ? 'text-amber-600' : 'text-red-500';
    const scoreBg = (s: number) =>
        s >= 80 ? 'bg-emerald-50 border-emerald-200' : s >= 60 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';

    const handlePrint = () => {
        window.print();
    };

    const yearMonthLabel = (() => {
        const [y, m] = report.yearMonth.split('-');
        return `${y}년 ${parseInt(m)}월`;
    })();

    return (
        <div ref={printRef} className="max-w-4xl mx-auto space-y-6 print:space-y-4">
            {/* Header */}
            <div className="bg-gradient-to-br from-[#0A0E27] via-[#1a1f4e] to-[#2d1b69] rounded-3xl p-8 text-white relative overflow-hidden print:rounded-none print:p-6">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -ml-24 -mb-24"></div>
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl">📊</span>
                                <h1 className="text-2xl font-black">성장 리포트</h1>
                                {report.status === 'draft' && (
                                    <span className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 text-[10px] font-bold border border-amber-400/30">초안</span>
                                )}
                            </div>
                            <p className="text-slate-300 text-sm">
                                <span className="font-bold text-white">{report.studentName}</span>
                                <span className="mx-2 text-slate-500">·</span>
                                {yearMonthLabel}
                            </p>
                        </div>
                        <div className="text-right print:hidden">
                            <div className={`text-5xl font-black ${overallScore >= 80 ? 'text-emerald-400' : overallScore >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                                {overallScore}
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">종합 점수</p>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 print:hidden">
                        <button onClick={handlePrint} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all border border-white/10">
                            🖨️ 인쇄
                        </button>
                        {isAdmin && report.status === 'draft' && onPublish && (
                            <button onClick={onPublish} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all shadow-lg">
                                📤 발행하기
                            </button>
                        )}
                        {isAdmin && onDelete && (
                            <button onClick={onDelete} className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold rounded-xl transition-all border border-red-500/20">
                                삭제
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Score Cards + Radar Chart */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
                {/* Score Cards */}
                <div className="space-y-3">
                    {[
                        { label: '어휘', score: report.vocabScore, trend: report.growth.vocabTrend, emoji: '📚' },
                        { label: '문법', score: report.grammarScore, trend: report.growth.grammarTrend, emoji: '✍️' },
                        { label: '독해', score: report.readingScore, trend: report.growth.readingTrend, emoji: '📖' },
                    ].map(item => (
                        <div key={item.label} className={`rounded-2xl p-5 border ${scoreBg(item.score)} transition-all`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{item.emoji}</span>
                                    <div>
                                        <h3 className="text-sm font-black text-slate-900">{item.label}</h3>
                                        <p className={`text-[10px] font-bold ${trendColor(item.trend)}`}>
                                            {trendIcon(item.trend)} {trendLabel(item.trend)}
                                        </p>
                                    </div>
                                </div>
                                <span className={`text-3xl font-black ${scoreColor(item.score)}`}>
                                    {item.score}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Radar Chart */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 flex items-center justify-center shadow-sm">
                    <ResponsiveContainer width="100%" height={250}>
                        <RadarChart data={radarData}>
                            <PolarGrid stroke="#e2e8f0" />
                            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 13, fontWeight: 700, fill: '#334155' }} />
                            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                            <Radar name="점수" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Vocabulary Detail */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
                    📚 어휘 상세
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard label="이번 달 학습" value={`${report.vocab.monthlyWordsLearned}개`} />
                    <StatCard label="누적 학습" value={`${report.vocab.totalWordsLearned}개`} />
                    <StatCard label="첫 시도 통과" value={`${report.vocab.firstTryPassRate}%`} accent={report.vocab.firstTryPassRate >= 60} />
                    <StatCard label="평균 시도" value={`${report.vocab.avgAttemptsToPass}회`} />
                </div>
                {report.vocab.recentWords.length > 0 && (
                    <div className="mt-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">최근 학습 단어</p>
                        <div className="flex flex-wrap gap-1.5">
                            {report.vocab.recentWords.map((w, i) => (
                                <span key={i} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-100">
                                    {w}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Grammar Detail */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
                    ✍️ 문법 상세
                </h3>
                {/* Two source indicators */}
                <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-[9px] font-bold px-2 py-1 bg-violet-50 text-violet-600 rounded-lg border border-violet-100">구조작문 (생산)</span>
                    <span className="text-[9px] font-bold px-2 py-1 bg-sky-50 text-sky-600 rounded-lg border border-sky-100">구조독해 기호분석 (분석)</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <StatCard label="작문 구문" value={`${report.grammar.sessionsAttempted}개`} />
                    <StatCard label="작문 평균" value={`${report.grammar.avgFirstAttemptScore}점`} accent={report.grammar.avgFirstAttemptScore >= 80} />
                    <StatCard label="독해 기호분석" value={`${(report.grammar as any).structureAnalysisCount || 0}건`} />
                    <StatCard label="기호 평균" value={`${(report.grammar as any).structureAnalysisAvg || 0}점`} accent={((report.grammar as any).structureAnalysisAvg || 0) >= 80} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {report.grammar.strongSessions.length > 0 && (
                        <div>
                            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-2">💪 강점 구문</p>
                            <div className="space-y-1.5">
                                {report.grammar.strongSessions.map((s, i) => (
                                    <div key={i} className="flex items-center justify-between px-3 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
                                        <span className="text-xs font-bold text-slate-700">{s.title}</span>
                                        <span className="text-xs font-black text-emerald-600">{s.score}점</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {report.grammar.weakSessions.length > 0 && (
                        <div>
                            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-2">🔧 보완 구문</p>
                            <div className="space-y-1.5">
                                {report.grammar.weakSessions.map((s, i) => (
                                    <div key={i} className="flex items-center justify-between px-3 py-2 bg-amber-50 rounded-xl border border-amber-100">
                                        <span className="text-xs font-bold text-slate-700">{s.title}</span>
                                        <span className="text-xs font-black text-amber-600">{s.score}점</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Reading Detail */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
                    📖 독해 상세
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <StatCard label="전체 제출" value={`${report.reading.totalSubmissions}건`} />
                    <StatCard label="해석 포함" value={`${report.reading.withTranslation}건`} />
                    <StatCard label="평균 점수" value={`${report.reading.avgScore}점`} accent={report.reading.avgScore >= 80} />
                    <StatCard label="기호만" value={`${report.reading.structureOnlyCount}건`} />
                </div>
                {report.reading.scoreHistory.length > 1 && (
                    <div className="mt-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">점수 추이</p>
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={report.reading.scoreHistory}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="title" tick={{ fontSize: 10, fill: '#94a3b8' }} angle={-20} textAnchor="end" height={60} />
                                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                <Tooltip
                                    contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e2e8f0' }}
                                    formatter={((value: any) => [`${value}점`, '점수']) as any}
                                />
                                <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* Improvement Areas */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-6">
                <h3 className="text-sm font-black text-slate-900 mb-3 flex items-center gap-2">
                    🎯 성장 필요 영역
                </h3>
                <div className="space-y-2">
                    {report.growth.improvements.map((imp, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                            <span className="text-amber-500 font-bold mt-0.5">•</span>
                            <span className="leading-relaxed">{imp}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* AI Summary */}
            {report.aiSummary && (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200 p-6">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                            💬 AI 총평
                        </h3>
                        <button
                            onClick={() => setShowAiSummary(!showAiSummary)}
                            className="text-[10px] font-bold text-indigo-400 hover:text-indigo-600 transition-colors print:hidden"
                        >
                            {showAiSummary ? '접기' : '펼치기'}
                        </button>
                    </div>
                    {showAiSummary && (
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                            {report.aiSummary}
                        </p>
                    )}
                </div>
            )}

            {/* Print Footer */}
            <div className="hidden print:block text-center text-xs text-slate-400 pt-4 border-t border-slate-200">
                청한영어 · {yearMonthLabel} 성장 리포트 · Generated by AI
            </div>
        </div>
    );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
    return (
        <div className={`px-4 py-3 rounded-xl border ${accent ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100'}`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
            <p className={`text-lg font-black mt-0.5 ${accent ? 'text-indigo-600' : 'text-slate-800'}`}>{value}</p>
        </div>
    );
}
