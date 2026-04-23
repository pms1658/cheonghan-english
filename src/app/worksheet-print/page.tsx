'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { dbService } from '@/services/db';
import Logo from '@/components/common/Logo';
import { SkeletonPrintPage } from '@/components/common/Skeleton';

interface AssignmentData {
    id: string;
    title: string;
    sentences: string[];
    translations?: string[];
}

function WorksheetContent() {
    const searchParams = useSearchParams();
    const idsParam = searchParams.get('ids') || searchParams.get('id') || '';
    const withTranslation = searchParams.get('translation') === 'true';

    const [loading, setLoading] = useState(true);
    const [translating, setTranslating] = useState(false);
    const [assignmentData, setAssignmentData] = useState<AssignmentData[]>([]);

    useEffect(() => {
        if (!idsParam) return;
        const ids = idsParam.split(',').filter(Boolean);

        const load = async () => {
            try {
                const found: AssignmentData[] = [];

                for (const id of ids) {
                    const ass = await dbService.getAssignmentById(id);
                    if (ass && ass.sentences) {
                        const sentences = (ass.sentences as any[]).map((s: any) =>
                            typeof s === 'string' ? s : s.original || String(s)
                        );
                        found.push({ id: ass.id, title: ass.title, sentences });
                    }
                }

                // Get translations if requested
                if (withTranslation && found.length > 0) {
                    setAssignmentData(found);
                    setLoading(false);
                    setTranslating(true);

                    for (let i = 0; i < found.length; i++) {
                        try {
                            const res = await fetch('/api/translate-sentences', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ sentences: found[i].sentences })
                            });
                            const data = await res.json();
                            if (data.translations) {
                                found[i].translations = data.translations;
                            }
                        } catch (e) {
                            console.error(`Translation failed for ${found[i].title}:`, e);
                        }
                    }

                    setAssignmentData([...found]);
                    setTranslating(false);
                } else {
                    setAssignmentData(found);
                    setLoading(false);
                }
            } catch (e) {
                console.error(e);
                setLoading(false);
            }
        };

        load();
    }, [idsParam, withTranslation]);

    // Auto print when ready
    useEffect(() => {
        if (!loading && !translating && assignmentData.length > 0) {
            const timer = setTimeout(() => window.print(), 500);
            return () => clearTimeout(timer);
        }
    }, [loading, translating, assignmentData]);

    if (loading) {
        return <SkeletonPrintPage />;
    }

    if (assignmentData.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-slate-500">과제를 찾을 수 없습니다.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <style>{`
                @media print {
                    body { margin: 0; }
                    .no-print { display: none !important; }
                    .print-break { page-break-before: always; }
                    .print-logo {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                }
                @page {
                    margin: 12mm 8mm;
                    size: A4;
                }
            `}</style>

            {/* Controls (hidden when printing) */}
            <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
                {translating && (
                    <div className="px-4 py-2 bg-blue-50 text-blue-600 text-sm font-bold rounded-lg border border-blue-200 flex items-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                        AI 번역 생성 중...
                    </div>
                )}
                <button
                    onClick={() => window.print()}
                    disabled={translating}
                    className="px-4 py-2 bg-[#0A0E27] text-white text-sm font-bold rounded-lg hover:bg-[#1a1f3d] shadow-lg flex items-center gap-2 disabled:opacity-50"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                    인쇄
                </button>
                <button
                    onClick={() => window.close()}
                    className="px-4 py-2 bg-slate-100 text-slate-600 text-sm font-bold rounded-lg hover:bg-slate-200 shadow-sm"
                >
                    닫기
                </button>
            </div>

            {/* Render each assignment as a section */}
            {assignmentData.map((assignment, assIdx) => (
                <div key={assignment.id} className={`max-w-[210mm] mx-auto px-4 py-6 ${assIdx > 0 ? 'print-break' : ''}`}>
                    {/* Header — Logo + Title + Name */}
                    <div className="flex items-center justify-between border-b-[3px] border-[#0A0E27] pb-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="print-logo" style={{ width: 48, height: 48, background: '#083973', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, flexShrink: 0, color: 'white', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as any}>
                                <Logo className="w-full h-full" />
                            </div>
                            <div>
                                <h1 className="text-xl font-extrabold text-[#1d1d1f] leading-tight">{assignment.title}</h1>
                                <p className="text-[11px] text-[#86868b] font-medium mt-0.5">
                                    구조독해 학습지 · CheongHan English
                                    {assignmentData.length > 1 && <span className="ml-2 text-blue-500">({assIdx + 1}/{assignmentData.length})</span>}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] text-slate-400 font-medium">이름</div>
                            <div className="w-24 border-b-2 border-slate-300 mt-1"></div>
                        </div>
                    </div>

                    {/* Sentences */}
                    <div className="space-y-0">
                        {assignment.sentences.map((sentence, idx) => (
                            <div key={idx} className="py-3 border-b border-slate-100 last:border-b-0">
                                {/* Sentence number + English */}
                                <div className="flex gap-3 items-start">
                                    <span className="text-[11px] font-bold text-slate-400 mt-0.5 flex-shrink-0 w-5 text-right">{idx + 1}</span>
                                    <p className="text-[14px] font-semibold text-[#1d1d1f] leading-relaxed flex-1">{sentence}</p>
                                </div>

                                {/* AI Translation (if enabled) */}
                                {withTranslation && assignment.translations?.[idx] && (
                                    <div className="flex gap-3 items-start mt-1.5">
                                        <span className="w-5 flex-shrink-0"></span>
                                        <p className="text-[12px] text-slate-500 leading-relaxed pl-2 border-l-2 border-slate-200">{assignment.translations[idx]}</p>
                                    </div>
                                )}

                                {/* Blank line for student writing — 넉넉한 필기 공간 */}
                                <div className="flex gap-3 items-start mt-2.5">
                                    <span className="w-5 flex-shrink-0"></span>
                                    <div className="flex-1 border-b border-dashed border-slate-300 pb-10"></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="mt-8 text-center text-[9px] text-[#aeaeb2] font-medium">
                        CheongHan English Institute | {new Date().toLocaleDateString('ko-KR')}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function WorksheetPrintPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-white">
                <p className="text-slate-400 font-bold text-sm animate-pulse">준비 중...</p>
            </div>
        }>
            <WorksheetContent />
        </Suspense>
    );
}
