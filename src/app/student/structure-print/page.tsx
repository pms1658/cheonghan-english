'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { dbService } from '@/services/db';
import StructureEditor, { MARK_STYLES, MarkType } from '@/components/student/StructureEditor';
import Logo from '@/components/common/Logo';
import { Assignment, Submission } from '@/types';
import { SkeletonPrintPage } from '@/components/common/Skeleton';

interface PrintData {
    assignment: Assignment;
    submission: Submission;
    sentences: string[];
    answersRecord: Record<number, any>;
    annotations: Record<string, string>;
    analysisNote: string;
}

function StructurePrintContent() {
    const searchParams = useSearchParams();
    const ids = searchParams.get('ids')?.split(',') || [];
    const studentId = searchParams.get('studentId') || '';
    const studentName = searchParams.get('studentName') || '';

    const [printData, setPrintData] = useState<PrintData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const allSubs = await dbService.getStudentSubmissions(studentId);
                const results: PrintData[] = [];

                for (const id of ids) {
                    const assignment = await dbService.getAssignmentById(id);
                    if (!assignment) continue;

                    const matchingSubs = allSubs
                        .filter(s => s.assignmentId === id)
                        .sort((a, b) => (b.score || 0) - (a.score || 0));

                    const bestSub = matchingSubs[0];
                    if (!bestSub || !assignment.sentences) continue;

                    // Convert sentences
                    const sentences = (assignment.sentences || []).map((s: any) =>
                        typeof s === 'string' ? s : (s.original || s.text || '')
                    );

                    // Convert answers from array [{index, value}] to Record
                    const answersRecord: Record<number, any> = {};
                    if (Array.isArray(bestSub.answers)) {
                        bestSub.answers.forEach((item: any) => {
                            if (item && typeof item.index === 'number' && item.value) {
                                answersRecord[item.index] = item.value;
                            }
                        });
                    } else if (bestSub.answers && typeof bestSub.answers === 'object') {
                        Object.assign(answersRecord, bestSub.answers);
                    }

                    results.push({ assignment, submission: bestSub, sentences, answersRecord, annotations: {}, analysisNote: '' });
                }

                // Load annotations for each result
                for (const result of results) {
                    try {
                        const saved = await dbService.getWordAnnotations(result.assignment.id, studentId);
                        if (saved && Object.keys(saved).length > 0) {
                            if (saved._analysisNote) {
                                result.analysisNote = saved._analysisNote;
                                delete saved._analysisNote;
                            }
                            result.annotations = saved;
                        }
                    } catch (e) {
                        console.error('Failed to load annotations for', result.assignment.id, e);
                    }
                }

                setPrintData(results);
            } catch (e) {
                console.error('Structure print loading error:', e);
            } finally {
                setLoading(false);
            }
        };

        if (ids.length > 0 && studentId) load();
        else setLoading(false);
    }, []);

    // Auto-print after data loads
    useEffect(() => {
        if (!loading && printData.length > 0) {
            setTimeout(() => window.print(), 600);
        }
    }, [loading, printData]);

    if (loading) {
        return <SkeletonPrintPage />;
    }

    if (printData.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-white">
                <div className="text-center">
                    <p className="text-4xl mb-3">📭</p>
                    <p className="text-slate-600 font-bold text-lg">인쇄할 데이터가 없습니다.</p>
                    <p className="text-sm text-slate-400 mt-2">
                        {!studentId ? 'studentId가 전달되지 않았습니다.' : `${ids.length}개 과제 중 제출 기록을 찾을 수 없습니다.`}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white min-h-screen">
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    .no-print { display: none !important; }
                    .page-break { page-break-before: always; }
                    body { 
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important;
                        margin: 0;
                    }
                }
                @media screen {
                    body { background: #f1f5f9; }
                }
                .passage-flow > div > div {
                    display: inline !important;
                    flex-direction: unset !important;
                }
                .passage-flow > div > div > div {
                    display: inline !important;
                    flex-wrap: wrap !important;
                    padding: 0 !important;
                    gap: 0 5px !important;
                }
                .passage-flow > div > div > div > div {
                    display: inline-flex !important;
                }
                .passage-flow > div::after {
                    content: ' ';
                    display: inline;
                    white-space: pre;
                    font-size: 4px;
                }
            ` }} />

            {/* Screen-only header */}
            <div className="no-print bg-[#0A0E27] text-white p-4 text-center sticky top-0 z-50">
                <p className="text-sm text-slate-400">{studentName} · {printData.length}개 과제</p>
                <button
                    onClick={() => window.print()}
                    className="mt-2 px-5 py-2 bg-white text-[#0A0E27] font-bold rounded-lg hover:bg-slate-100 transition-colors inline-flex items-center gap-2 text-sm"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                    인쇄하기
                </button>
            </div>

            {/* Print content */}
            {printData.map(({ assignment, submission, sentences, answersRecord, annotations, analysisNote }, idx) => (
                <div key={assignment.id} className={idx > 0 ? 'page-break' : ''}>
                    <div className="max-w-4xl mx-auto px-8 py-6 bg-white">
                        {/* Assignment Header */}
                        <div className="flex items-center justify-between border-b-[3px] border-[#0A0E27] pb-4 mb-5">
                            <div className="flex items-center gap-3">
                                <div style={{ width: 48, height: 48, background: '#083973', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, flexShrink: 0, color: 'white' }}>
                                    <Logo className="w-full h-full" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-extrabold text-[#1d1d1f] leading-tight">{assignment.title}</h2>
                                    <p className="text-[11px] text-[#86868b] font-medium mt-0.5">
                                        {studentName && <span>{studentName}</span>}
                                        <span> · {submission.attempt || submission.attemptNumber || 1}차 시도</span>
                                    </p>
                                </div>
                            </div>
                            {submission.score !== undefined && (
                                <div className="flex items-baseline gap-1 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-400 rounded-lg px-3 py-1">
                                    <span className="text-xl font-black text-blue-600">{submission.score}</span>
                                    <span className="text-xs text-slate-400 font-bold">점</span>
                                </div>
                            )}
                        </div>

                        {/* Legend */}
                        <div className="flex justify-center gap-4 flex-wrap mb-5 px-5 py-3 bg-[#f5f5f7] rounded-xl">
                            {(Object.keys(MARK_STYLES) as MarkType[]).map(type => (
                                <div key={type} className="flex items-center gap-1.5 text-[11px] font-semibold text-[#6e6e73]">
                                    <div className={`w-2.5 h-2.5 rounded-full ${MARK_STYLES[type].bg}`}></div>
                                    <span>{MARK_STYLES[type].label}</span>
                                    <span className="text-[#aeaeb2]">{MARK_STYLES[type].name}</span>
                                </div>
                            ))}
                        </div>

                        {/* Passage — continuous flowing text */}
                        <div className="pointer-events-none passage-flow leading-[2.8] text-[16px] md:text-[19px] font-medium tracking-tight">
                            {sentences.map((sentence, sIdx) => {
                                const studentMarks = answersRecord[sIdx]?.marks || [];
                                return (
                                    <div key={sIdx} style={{ display: 'inline' }}>
                                        <StructureEditor
                                            text={sentence}
                                            initialMarks={studentMarks}
                                            readOnly={true}
                                            hideLegend={true}
                                            annotations={annotations}
                                            sentenceIndex={sIdx}
                                        />
                                    </div>
                                );
                            })}
                        </div>

                        {/* Analysis Notes Section — blue frame (only if there's content) */}
                        {analysisNote && (
                            <div className="mt-6 border-2 border-blue-400 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                    <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">분석 노트</span>
                                </div>
                                <p className="text-[13px] text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">{analysisNote}</p>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="mt-4 text-center text-[9px] text-[#aeaeb2] font-medium">
                            CheongHan English Institute | {new Date().toLocaleDateString('ko-KR')}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function StructurePrintPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-white">
            <SkeletonPrintPage />
            </div>
        }>
            <StructurePrintContent />
        </Suspense>
    );
}
