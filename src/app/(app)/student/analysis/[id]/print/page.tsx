'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { dbService } from '@/services/db';
import AnalysisViewer, { normalizeAnalyzedString } from '@/components/student/AnalysisViewer';
import StructureEditor, { parseAnalysisString } from '@/components/student/StructureEditor';
import { SkeletonPrintPage } from '@/components/common/Skeleton';

export default function AnalysisPrintPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const assignmentId = params.id as string;
    const studentId = searchParams.get('studentId');
    const printMode = searchParams.get('mode') || 'detail';

    const [assignment, setAssignment] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [annotations, setAnnotations] = useState<Record<string, string>>({});

    useEffect(() => {
        const load = async () => {
            try {
                const a = await dbService.getAssignmentById(assignmentId);
                setAssignment(a);
                if (studentId) {
                    const saved = await dbService.getWordAnnotations(assignmentId, studentId);
                    if (saved && Object.keys(saved).length > 0) {
                        const clean = { ...saved };
                        delete clean._analysisNote;
                        setAnnotations(clean);
                    }
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [assignmentId, studentId]);

    useEffect(() => {
        if (!loading && assignment) {
            setTimeout(() => window.print(), 1200);
        }
    }, [loading, assignment]);

    if (loading) {
        return <SkeletonPrintPage />;
    }

    if (!assignment) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-xl mb-2">❌</p>
                    <p className="text-slate-500">과제를 찾을 수 없습니다.</p>
                </div>
            </div>
        );
    }

    const structure = assignment.structure;
    const keyGrammar = assignment.keyGrammar;
    const vocabSummary = assignment.vocabSummary;
    const examPrediction = assignment.examPrediction;
    const tfCheck = assignment.tfCheck;
    const annotationCount = Object.keys(annotations).length;

    return (
        <div className="max-w-[800px] mx-auto p-6 print:p-4 print:max-w-none font-sans text-slate-800">
            <style jsx global>{`
                @media print {
                    body { 
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important;
                        font-size: 11px;
                    }
                    .no-print { display: none !important; }
                    .page-break { page-break-before: always; }
                    .avoid-break { page-break-inside: avoid; }
                }
                @page {
                    margin: 15mm 12mm;
                }
                .print-passage-flow > div > div {
                    display: inline !important;
                    flex-direction: unset !important;
                }
                .print-passage-flow > div > div > div {
                    display: inline !important;
                    flex-wrap: wrap !important;
                    padding: 0 !important;
                    gap: 0 3px !important;
                }
                .print-passage-flow > div > div > div > div {
                    display: inline-flex !important;
                }
                .print-passage-flow > div::after {
                    content: ' ';
                    display: inline;
                    white-space: pre;
                    font-size: 4px;
                }
            `}</style>

            {/* Print Button */}
            <div className="text-center mb-6 no-print">
                <button onClick={() => window.print()} className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-lg">
                    🖨️ 인쇄하기
                </button>
                <button onClick={() => window.close()} className="ml-3 px-6 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-lg hover:bg-slate-200 transition-colors">
                    닫기
                </button>
            </div>

            {/* HEADER */}
            <div className="mb-5 pb-3 border-b-2 border-slate-800 avoid-break">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight">{assignment.title}</h1>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-medium tracking-wider">청한외국어학원 · Deep Analysis</p>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] text-slate-400">이름</div>
                        <div className="w-24 border-b border-slate-300 mt-1"></div>
                    </div>
                </div>
            </div>

            {/* FULL PASSAGE with memos */}
            {(printMode === 'passage' || annotationCount > 0) && (
                <div className="mb-4 border border-slate-300 rounded-xl p-4 avoid-break">
                    <h2 className="text-xs font-bold text-slate-600 mb-3 uppercase tracking-wider">
                        📖 전체 지문 {annotationCount > 0 && <span className="text-amber-600 normal-case">({annotationCount}개 메모)</span>}
                    </h2>
                    <div className="print-passage-flow leading-[2.8] text-[13px] font-medium tracking-tight">
                        {assignment.sentences?.map((sent: any, idx: number) => {
                            const analyzed = normalizeAnalyzedString(sent.analyzed || '');
                            const marks = analyzed ? parseAnalysisString(sent.original, analyzed) : [];
                            return (
                                <div key={idx} style={{ display: 'inline' }}>
                                    <StructureEditor
                                        text={sent.original}
                                        initialMarks={marks}
                                        readOnly={true}
                                        hideLegend={true}
                                        annotations={annotations}
                                        sentenceIndex={idx}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* SUMMARY */}
            {(assignment.topic || assignment.claim) && (
                <div className="mb-5 bg-slate-900 text-white rounded-xl p-4 avoid-break">
                    <div className="text-[9px] font-bold bg-white/20 px-2 py-0.5 rounded-full inline-block uppercase tracking-wider mb-2">SUMMARY</div>
                    {assignment.topic && (
                        <div className="mb-1.5">
                            <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider">주제</span>
                            <p className="text-white/90 font-medium text-xs leading-relaxed">{assignment.topic}</p>
                        </div>
                    )}
                    {assignment.claim && (
                        <div>
                            <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider">요지</span>
                            <p className="text-white/90 font-medium text-xs leading-relaxed">{assignment.claim}</p>
                        </div>
                    )}
                </div>
            )}

            {/* STRUCTURE */}
            {structure && (
                <div className="mb-5 border border-indigo-200 rounded-xl p-4 bg-indigo-50/30 avoid-break">
                    <h2 className="text-xs font-bold text-indigo-800 mb-2 flex items-center gap-1.5">📐 글의 구조</h2>
                    <div className="space-y-1.5 text-[11px]">
                        {structure.intro && (
                            <div className="flex gap-2 items-start">
                                <span className="text-[9px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200 flex-shrink-0">도입부</span>
                                <p className="text-slate-700 leading-relaxed">{structure.intro.note}</p>
                            </div>
                        )}
                        {structure.body?.map((b: any, bi: number) => (
                            <div key={bi} className="flex gap-2 items-start">
                                <span className="text-[9px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full border border-green-200 flex-shrink-0">
                                    본론{structure.body.length > 1 ? ` ${bi + 1}` : ''}
                                </span>
                                <p className="text-slate-700 leading-relaxed">{b.note}</p>
                            </div>
                        ))}
                        {structure.conclusion && (
                            <div className="flex gap-2 items-start">
                                <span className="text-[9px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full border border-red-200 flex-shrink-0">결론</span>
                                <p className="text-slate-700 leading-relaxed">{structure.conclusion.note}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* SENTENCE ANALYSIS (only in detail mode) */}
            {printMode !== 'passage' && (
            <div className="space-y-4 mb-6">
                {assignment.sentences?.map((sent: any, idx: number) => {
                    const sentId = typeof sent.id === 'number' ? sent.id : idx + 1;
                    const isIntro = structure?.intro?.sentenceIds?.includes(sentId);
                    const isConclusion = structure?.conclusion?.sentenceIds?.includes(sentId);
                    const bodySection = structure?.body?.find((b: any) => b.sentenceIds?.includes(sentId));
                    let sectionLabel = '';
                    let sectionColor = '';
                    if (isIntro && structure?.intro?.sentenceIds?.[0] === sentId) { sectionLabel = '도입부'; sectionColor = 'border-blue-400 bg-blue-50 text-blue-700'; }
                    if (bodySection && bodySection.sentenceIds?.[0] === sentId) { sectionLabel = '본론'; sectionColor = 'border-green-400 bg-green-50 text-green-700'; }
                    if (isConclusion && structure?.conclusion?.sentenceIds?.[0] === sentId) { sectionLabel = '결론'; sectionColor = 'border-red-400 bg-red-50 text-red-700'; }
                    return (
                        <div key={idx} className="avoid-break">
                            {sectionLabel && (
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${sectionColor}`}>{sectionLabel}</span>
                                    <div className="flex-1 border-t border-slate-200"></div>
                                </div>
                            )}
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <div className="p-3">
                                    <div className="flex items-start gap-2 mb-2">
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold mt-0.5">{sentId}</span>
                                        <div className="flex-1 min-w-0">
                                            <AnalysisViewer sentences={[sent]} expandAll={true} />
                                        </div>
                                    </div>
                                    {sent.wordByWord && (
                                        <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-100">
                                            <span className="text-[8px] font-bold text-amber-600 uppercase tracking-wider block mb-0.5">단어별 해석</span>
                                            <p className="text-[10px] text-amber-800 leading-relaxed font-medium">{sent.wordByWord}</p>
                                        </div>
                                    )}
                                    {sent.grammarNotes?.length > 0 && (
                                        <div className="mt-2 p-2 bg-sky-50 rounded-lg border border-sky-100">
                                            <span className="text-[8px] font-bold text-sky-600 uppercase tracking-wider block mb-0.5">문법 포인트</span>
                                            <ul className="space-y-0.5">
                                                {sent.grammarNotes.map((note: string, ni: number) => (
                                                    <li key={ni} className="text-[10px] text-sky-800 font-medium flex items-start gap-1">
                                                        <span className="text-sky-400 mt-0.5">•</span>{note}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            )}

            {/* KEY GRAMMAR */}
            {keyGrammar && keyGrammar.length > 0 && (
                <div className="mb-5 border border-purple-200 rounded-xl p-4 bg-purple-50/30 avoid-break page-break">
                    <h2 className="text-xs font-bold text-purple-800 mb-3 flex items-center gap-1.5">📝 핵심 문법 사항</h2>
                    <div className="space-y-3">
                        {keyGrammar.map((kg: any, ki: number) => (
                            <div key={ki} className="border-l-2 border-purple-300 pl-2.5 avoid-break">
                                <h4 className="text-[11px] font-bold text-purple-700 mb-0.5">{kg.point}</h4>
                                <p className="text-[10px] text-slate-600 leading-relaxed mb-0.5">{kg.explanation}</p>
                                {kg.example && <p className="text-[10px] text-slate-500 italic bg-purple-50 p-1.5 rounded">예: {kg.example}</p>}
                                {kg.related && <p className="text-[9px] text-purple-400 mt-0.5">{kg.related}</p>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* EXAM PREDICTION */}
            {examPrediction && examPrediction.length > 0 && (
                <div className="mb-5 border border-orange-200 rounded-xl p-4 bg-orange-50/30 avoid-break">
                    <h2 className="text-xs font-bold text-orange-800 mb-3 flex items-center gap-1.5">🎯 변형문제 예상</h2>
                    <div className="space-y-2">
                        {examPrediction.map((ep: any, ei: number) => (
                            <div key={ei} className="flex items-start gap-2 avoid-break">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                                    ep.likelihood === '높음' ? 'bg-red-100 text-red-600 border border-red-200' :
                                    ep.likelihood === '보통' ? 'bg-amber-100 text-amber-600 border border-amber-200' :
                                    'bg-slate-100 text-slate-500 border border-slate-200'
                                }`}>{ep.likelihood}</span>
                                <div>
                                    <span className="text-[11px] font-bold text-slate-700">{ep.type}</span>
                                    <p className="text-[10px] text-slate-500">{ep.reason}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* VOCAB */}
            {vocabSummary && vocabSummary.length > 0 && (
                <div className="mb-5 border border-emerald-200 rounded-xl p-4 bg-emerald-50/20 avoid-break">
                    <h2 className="text-xs font-bold text-emerald-800 mb-3 flex items-center gap-1.5">📚 어휘 종합</h2>
                    <table className="w-full text-[10px]">
                        <thead>
                            <tr className="border-b-2 border-slate-200">
                                <th className="text-left py-1.5 px-2 font-bold text-slate-500 uppercase">Word</th>
                                <th className="text-left py-1.5 px-2 font-bold text-slate-500 uppercase">뜻</th>
                                <th className="text-left py-1.5 px-2 font-bold text-slate-500 uppercase">품사</th>
                                <th className="text-left py-1.5 px-2 font-bold text-slate-500 uppercase">유의어</th>
                                <th className="text-left py-1.5 px-2 font-bold text-slate-500 uppercase">반의어</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {vocabSummary.map((v: any, vi: number) => (
                                <tr key={vi}>
                                    <td className="py-1.5 px-2 font-bold text-slate-800">{v.word}</td>
                                    <td className="py-1.5 px-2 text-slate-600">{v.meaning}</td>
                                    <td className="py-1.5 px-2 text-slate-400">{v.pos}</td>
                                    <td className="py-1.5 px-2 text-emerald-600">{v.synonym || '-'}</td>
                                    <td className="py-1.5 px-2 text-red-500">{v.antonym || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* T/F */}
            {tfCheck && tfCheck.length > 0 && (
                <div className="mb-5 border border-cyan-200 rounded-xl p-4 bg-cyan-50/20 avoid-break">
                    <h2 className="text-xs font-bold text-cyan-800 mb-3 flex items-center gap-1.5">✓ T/F CHECK</h2>
                    <div className="space-y-2">
                        {tfCheck.map((tf: any, ti: number) => (
                            <div key={ti} className="flex items-start gap-2 p-2 rounded-lg bg-white border border-slate-100 avoid-break">
                                <span className="text-[10px] font-bold text-slate-400 mt-0.5">{ti + 1}.</span>
                                <div className="flex-1">
                                    <p className="text-[11px] text-slate-700 font-medium mb-1">{tf.statement}</p>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                            tf.answer ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-100 text-red-700 border border-red-200'
                                        }`}>{tf.answer ? 'TRUE ✓' : 'FALSE ✗'}</span>
                                        <span className="text-[10px] text-slate-500">{tf.explanation}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="mt-8 pt-3 border-t border-slate-200 text-center">
                <p className="text-[9px] text-slate-400 font-medium">© 청한외국어학원 · Deep Analysis Report · Generated by AI</p>
            </div>
        </div>
    );
}
