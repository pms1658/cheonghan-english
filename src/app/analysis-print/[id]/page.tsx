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
    const printMode = searchParams.get('mode') || 'detail'; // 'detail' or 'passage'

    const [assignment, setAssignment] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [annotations, setAnnotations] = useState<Record<string, string>>({});

    useEffect(() => {
        const load = async () => {
            try {
                const a = await dbService.getAssignmentById(assignmentId);
                setAssignment(a);
                // Load student annotations if studentId is provided
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
                    <p className="text-lg mb-2">❌</p>
                    <p className="text-slate-500 text-sm">과제를 찾을 수 없습니다.</p>
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
        <div className="max-w-[780px] mx-auto px-4 py-3 print:p-0 print:max-w-none font-sans text-slate-800" style={{ fontSize: '10px' }}>
            <style jsx global>{`
                @media print {
                    body { 
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important;
                        font-size: 9px !important;
                        margin: 0;
                        padding: 0;
                    }
                    .no-print { display: none !important; }
                    .page-break { page-break-before: always; }
                    .avoid-break { page-break-inside: avoid; }
                    .print-sentence span[class*="leading-"] {
                        font-size: 12px !important;
                        line-height: 2 !important;
                    }
                    .print-sentence span.text-base,
                    .print-sentence span.md\\:text-xl {
                        font-size: 12px !important;
                    }
                    .print-sentence span[class*="-bottom-5"] {
                        bottom: -14px !important;
                        font-size: 7px !important;
                        padding: 0 3px !important;
                    }
                }
                @page {
                    margin: 8mm 8mm;
                    size: A4;
                }
                .print-sentence span[class*="leading-"] {
                    font-size: 13px !important;
                    line-height: 2.2 !important;
                }
                .print-en { font-size: 0.82em; letter-spacing: -0.01em; }
                /* Passage flow for print */
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
                    font-size: 3px;
                }
                .print-passage-flow span,
                .print-passage-flow div {
                    font-size: inherit !important;
                    line-height: inherit !important;
                }
            `}</style>

            {/* Print Button (no-print) */}
            <div className="text-center mb-4 no-print">
                <button
                    onClick={() => window.print()}
                    className="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-md text-sm"
                >
                    🖨️ 인쇄하기
                </button>
                <button
                    onClick={() => window.close()}
                    className="ml-2 px-5 py-2 bg-slate-100 text-slate-600 font-bold rounded-lg hover:bg-slate-200 transition-colors text-sm"
                >
                    닫기
                </button>
            </div>

            {/* ═══ HEADER ═══ */}
            <div className="mb-2 pb-1.5 border-b-2 border-slate-800 avoid-break">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-base font-black text-slate-900 tracking-tight leading-tight">{assignment.title}</h1>
                        <p className="text-[8px] text-slate-400 mt-0.5 font-medium tracking-wider">청한외국어학원 · Deep Analysis</p>
                    </div>
                    <div className="text-right">
                        <div className="text-[8px] text-slate-400">이름</div>
                        <div className="w-20 border-b border-slate-300 mt-0.5"></div>
                    </div>
                </div>
            </div>

            {/* ═══ FULL PASSAGE VIEW (with memos) ═══ */}
            {(printMode === 'passage' || annotationCount > 0) && (
                <div className="mb-3 border border-slate-300 rounded-lg p-3 avoid-break">
                    <h2 className="text-[10px] font-bold text-slate-600 mb-2 uppercase tracking-wider">
                        📖 전체 지문 {annotationCount > 0 && <span className="text-amber-600 normal-case">({annotationCount}개 메모)</span>}
                    </h2>
                    <div className="print-passage-flow leading-[2.6] text-[11px] font-medium tracking-tight">
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

            {/* ═══ SUMMARY BAR ═══ */}
            {(assignment.topic || assignment.claim) && (
                <div className="mb-2 bg-slate-900 text-white rounded-lg p-2 avoid-break">
                    <div className="text-[8px] font-bold bg-white/20 px-1.5 py-0.5 rounded inline-block uppercase tracking-wider mb-1">SUMMARY</div>
                    {assignment.topic && (
                        <div className="mb-1">
                            <span className="text-[8px] font-bold text-white/50 uppercase">주제 </span>
                            <span className="text-white/90 font-medium text-[10px]">{assignment.topic}</span>
                        </div>
                    )}
                    {assignment.claim && (
                        <div>
                            <span className="text-[8px] font-bold text-white/50 uppercase">요지 </span>
                            <span className="text-white/90 font-medium text-[10px]">{assignment.claim}</span>
                        </div>
                    )}
                </div>
            )}

            {/* ═══ STRUCTURE + TRANSLATIONS ═══ */}
            {structure && assignment.sentences?.length > 0 && (
                <div className="mb-2 border border-indigo-200 rounded-lg p-2 bg-indigo-50/30 avoid-break">
                    <h2 className="text-[10px] font-bold text-indigo-800 mb-1.5 flex items-center gap-1">
                        📐 글의 구조 · 해석
                    </h2>
                    <div className="space-y-2">
                        {/* 도입부 */}
                        {structure.intro && (
                            <div>
                                <div className="flex items-center gap-1.5 mb-1">
                                    <span className="text-[8px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200 leading-none">도입부</span>
                                    {structure.intro.note && <span className="text-[8px] text-slate-500 italic">{structure.intro.note}</span>}
                                </div>
                                <div className="space-y-0.5 pl-1 border-l-2 border-blue-200">
                                    {assignment.sentences.filter((_: any, i: number) => structure.intro.sentenceIds?.includes(typeof assignment.sentences[i].id === 'number' ? assignment.sentences[i].id : i + 1)).map((sent: any, si: number) => {
                                        const sentId = typeof sent.id === 'number' ? sent.id : structure.intro.sentenceIds[si];
                                        return (
                                            <div key={si} className="flex gap-1.5 text-[9px] pl-1">
                                                <span className="text-blue-500 font-bold flex-shrink-0">{"❶❷❸❹❺❻❼❽❾❿".charAt(sentId - 1) || sentId}</span>
                                                <p className="text-slate-700 leading-snug">{sent.translation}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        {/* 본론 */}
                        {structure.body?.map((b: any, bi: number) => (
                            <div key={bi}>
                                <div className="flex items-center gap-1.5 mb-1">
                                    <span className="text-[8px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded border border-green-200 leading-none">본론{structure.body.length > 1 ? ` ${bi + 1}` : ''}</span>
                                    {b.note && <span className="text-[8px] text-slate-500 italic">{b.note}</span>}
                                </div>
                                <div className="space-y-0.5 pl-1 border-l-2 border-green-200">
                                    {assignment.sentences.filter((_: any, i: number) => b.sentenceIds?.includes(typeof assignment.sentences[i].id === 'number' ? assignment.sentences[i].id : i + 1)).map((sent: any, si: number) => {
                                        const sentId = typeof sent.id === 'number' ? sent.id : b.sentenceIds[si];
                                        return (
                                            <div key={si} className="flex gap-1.5 text-[9px] pl-1">
                                                <span className="text-green-500 font-bold flex-shrink-0">{"❶❷❸❹❺❻❼❽❾❿".charAt(sentId - 1) || sentId}</span>
                                                <p className="text-slate-700 leading-snug">{sent.translation}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                        {/* 결론 */}
                        {structure.conclusion && (
                            <div>
                                <div className="flex items-center gap-1.5 mb-1">
                                    <span className="text-[8px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded border border-red-200 leading-none">결론</span>
                                    {structure.conclusion.note && <span className="text-[8px] text-slate-500 italic">{structure.conclusion.note}</span>}
                                </div>
                                <div className="space-y-0.5 pl-1 border-l-2 border-red-200">
                                    {assignment.sentences.filter((_: any, i: number) => structure.conclusion.sentenceIds?.includes(typeof assignment.sentences[i].id === 'number' ? assignment.sentences[i].id : i + 1)).map((sent: any, si: number) => {
                                        const sentId = typeof sent.id === 'number' ? sent.id : structure.conclusion.sentenceIds[si];
                                        return (
                                            <div key={si} className="flex gap-1.5 text-[9px] pl-1">
                                                <span className="text-red-500 font-bold flex-shrink-0">{"❶❷❸❹❺❻❼❽❾❿".charAt(sentId - 1) || sentId}</span>
                                                <p className="text-slate-700 leading-snug">{sent.translation}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══ SENTENCE ANALYSIS ═══ */}
            {printMode !== 'passage' && (
            <div className="space-y-1.5 mb-3">
                {assignment.sentences?.map((sent: any, idx: number) => {
                    const sentId = typeof sent.id === 'number' ? sent.id : idx + 1;
                    
                    const isIntro = structure?.intro?.sentenceIds?.includes(sentId);
                    const isConclusion = structure?.conclusion?.sentenceIds?.includes(sentId);
                    const bodySection = structure?.body?.find((b: any) => b.sentenceIds?.includes(sentId));
                    
                    let sectionLabel = '';
                    let sectionColor = '';
                    if (isIntro && structure?.intro?.sentenceIds?.[0] === sentId) {
                        sectionLabel = '도입부';
                        sectionColor = 'border-blue-400 bg-blue-50 text-blue-700';
                    }
                    if (bodySection && bodySection.sentenceIds?.[0] === sentId) {
                        sectionLabel = '본론';
                        sectionColor = 'border-green-400 bg-green-50 text-green-700';
                    }
                    if (isConclusion && structure?.conclusion?.sentenceIds?.[0] === sentId) {
                        sectionLabel = '결론';
                        sectionColor = 'border-red-400 bg-red-50 text-red-700';
                    }
                    
                    return (
                        <div key={idx} className="avoid-break">
                            {sectionLabel && (
                                <div className="flex items-center gap-1.5 mb-1">
                                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${sectionColor} leading-none`}>{sectionLabel}</span>
                                    <div className="flex-1 border-t border-slate-200"></div>
                                </div>
                            )}
                            
                            <div className="border border-slate-200 rounded overflow-hidden">
                                <div className="px-2 py-1">
                                    <div className="flex items-start gap-1.5">
                                        <span className="flex-shrink-0 w-4 h-4 rounded-full bg-slate-800 text-white flex items-center justify-center text-[7px] font-bold mt-1">
                                            {sentId}
                                        </span>
                                        <div className="flex-1 min-w-0 print-sentence">
                                            <AnalysisViewer sentences={[sent]} expandAll={true} />
                                        </div>
                                    </div>
                                    
                                    {sent.wordByWord && (
                                        <div className="mt-1 px-1.5 py-0.5 bg-amber-50 rounded border border-amber-100">
                                            <span className="text-[8px] font-bold text-amber-600 uppercase tracking-wider">단어별 해석 </span>
                                            <span className="text-[9px] text-amber-800 leading-snug font-medium">{sent.wordByWord}</span>
                                        </div>
                                    )}
                                    
                                    {sent.grammarNotes?.length > 0 && (
                                        <div className="mt-1 px-1.5 py-0.5 bg-sky-50 rounded border border-sky-100">
                                            <span className="text-[8px] font-bold text-sky-600 uppercase tracking-wider block">문법 포인트</span>
                                            <ul className="space-y-0.5">
                                                {sent.grammarNotes.map((note: string, ni: number) => (
                                                    <li key={ni} className="text-[9px] text-sky-800 font-medium flex items-start gap-1">
                                                        <span className="text-sky-400">•</span>
                                                        {note}
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

            {/* ═══ KEY GRAMMAR ═══ */}
            {keyGrammar && keyGrammar.length > 0 && (
                <div className="mb-2 border border-purple-200 rounded-lg p-2 bg-purple-50/30 avoid-break">
                    <h2 className="text-[10px] font-bold text-purple-800 mb-2 flex items-center gap-1">
                        📝 핵심 문법 사항
                    </h2>
                    <div className="space-y-2">
                        {keyGrammar.map((kg: any, ki: number) => (
                            <div key={ki} className="border-l-2 border-purple-300 pl-2 avoid-break">
                                <h4 className="text-[9px] font-bold text-purple-700">{kg.point}</h4>
                                <p className="text-[9px] text-slate-600 leading-snug">{kg.explanation}</p>
                                {kg.example && (
                                    <p className="text-[9px] text-slate-500 italic bg-purple-50 p-1 rounded mt-0.5 print-en">예: {kg.example}</p>
                                )}
                                {kg.related && (
                                    <p className="text-[8px] text-purple-400 mt-0.5">{kg.related}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ═══ VOCAB SUMMARY ═══ */}
            {vocabSummary && vocabSummary.length > 0 && (
                <div className="mb-2 border border-emerald-200 rounded-lg p-2 bg-emerald-50/20 avoid-break">
                    <h2 className="text-[10px] font-bold text-emerald-800 mb-1.5 flex items-center gap-1">📚 어휘 종합</h2>
                    <table className="w-full text-[9px]">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="text-left py-0.5 px-1 font-bold text-slate-500 uppercase text-[8px]">Word</th>
                                <th className="text-left py-0.5 px-1 font-bold text-slate-500 uppercase text-[8px]">뜻</th>
                                <th className="text-left py-0.5 px-1 font-bold text-slate-500 uppercase text-[8px]">품사</th>
                                <th className="text-left py-0.5 px-1 font-bold text-slate-500 uppercase text-[8px]">유의어</th>
                                <th className="text-left py-0.5 px-1 font-bold text-slate-500 uppercase text-[8px]">반의어</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {vocabSummary.map((v: any, vi: number) => (
                                <tr key={vi}>
                                    <td className="py-px px-1 font-bold text-slate-800 print-en">{v.word}</td>
                                    <td className="py-px px-1 text-slate-600">{v.meaning}</td>
                                    <td className="py-px px-1 text-slate-400">{v.pos}</td>
                                    <td className="py-px px-1 text-emerald-600 print-en">{v.synonym || '-'}</td>
                                    <td className="py-px px-1 text-red-500 print-en">{v.antonym || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Footer */}
            <div className="mt-4 pt-2 border-t border-slate-200 text-center">
                <p className="text-[7px] text-slate-400 font-medium">© 청한외국어학원 · Deep Analysis Report</p>
            </div>
        </div>
    );
}
