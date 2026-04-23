import { useState } from 'react';
import { AnalysisSentence } from '@/types';
import StructureEditor, { parseAnalysisString } from '@/components/student/StructureEditor';

interface AnalysisViewerProps {
    sentences: AnalysisSentence[];
    readOnly?: boolean;
    expandAll?: boolean;
    startIndex?: number;
}

/**
 * Normalize the AI-generated analyzed string so it's compatible with
 * StructureEditor's parseAnalysisString().
 * - Converts [Conn]word[/Conn] → [word](O)  (connector mark)
 */
export const normalizeAnalyzedString = (analyzed: string): string => {
    if (!analyzed) return '';
    let result = analyzed;
    // [Conn]However[/Conn] → [However](O)
    result = result.replace(/\[Conn\](.*?)\[\/Conn\]/g, '[$1](O)');
    // [V]word[/V] → [word](V) — AI sometimes generates old-format verb tags
    result = result.replace(/\[V\](.*?)\[\/V\]/g, '[$1](V)');
    // [S]...[/S] → [qn]...[/qn] — old-format subject tags mapped to nominal
    result = result.replace(/\[S\](.*?)\[\/S\]/g, '[qn]$1[/qn]');
    // [O]...[/O] → [qn]...[/qn] — old-format object tags mapped to nominal
    result = result.replace(/\[O\](.*?)\[\/O\]/g, '[qn]$1[/qn]');
    // [C]...[/C] → [qn]...[/qn] — old-format complement tags mapped to nominal
    result = result.replace(/\[C\](.*?)\[\/C\]/g, '[qn]$1[/qn]');
    return result;
};

export default function AnalysisViewer({ sentences, expandAll = false, startIndex = 0 }: AnalysisViewerProps) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const toggle = (idx: number) => setOpenIndex(openIndex === idx ? null : idx);
    const isVisible = (idx: number) => expandAll || openIndex === idx;

    return (
        <div className="flex flex-col gap-6 w-full">
            {sentences.map((sent, idx) => {
                const analyzed = normalizeAnalyzedString(sent.analyzed || '');
                const marks = analyzed ? parseAnalysisString(sent.original, analyzed) : [];

                return (
                    <div
                        key={idx}
                        className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:border-slate-300 print:shadow-none"
                    >
                        {/* Header / Main Sentence — rendered via StructureEditor */}
                        <div
                            className="cursor-pointer hover:bg-slate-50/50 transition-colors"
                            onClick={() => toggle(idx)}
                        >
                            <div className="flex items-start gap-3 p-4 md:p-5">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold mt-2">
                                    {startIndex + idx + 1}
                                </span>
                                <div className="flex-1 min-w-0 overflow-x-auto">
                                    <StructureEditor
                                        text={sent.original}
                                        initialMarks={marks}
                                        readOnly={true}
                                        hideLegend={true}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Details (Translation, Grammar, Vocab) */}
                        {(expandAll || isVisible(idx)) && (
                            <div className="border-t border-slate-100 divide-y divide-slate-100 bg-slate-50/50">
                                {/* Translation */}
                                <div className="p-3 px-4 md:p-4 md:px-6 flex gap-3 md:gap-4">
                                    <span className="text-[10px] font-bold text-slate-400 tracking-widest mt-1 min-w-[36px] md:min-w-[44px]">해석</span>
                                    <p className="text-slate-700 font-medium leading-relaxed">{sent.translation}</p>
                                </div>

                                {/* Grammar Points */}
                                {sent.grammar && sent.grammar.length > 0 && (
                                    <div className="p-3 px-4 md:p-4 md:px-6 flex gap-3 md:gap-4 bg-sky-50/30">
                                        <span className="text-[10px] font-bold text-sky-500 tracking-widest mt-1 min-w-[36px] md:min-w-[44px]">포인트</span>
                                        <ul className="space-y-1">
                                            {sent.grammar.map((g, i) => (
                                                <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                                    <span className="text-sky-400 mt-1">•</span>
                                                    {g}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Vocabulary */}
                                {sent.vocab && sent.vocab.length > 0 && (
                                    <div className="p-3 px-4 md:p-4 md:px-6 flex gap-3 md:gap-4">
                                        <span className="text-[10px] font-bold text-slate-400 tracking-widest mt-1 min-w-[36px] md:min-w-[44px]">단어</span>
                                        <div className="flex flex-wrap gap-2">
                                            {sent.vocab.map((v, i) => (
                                                <span key={i} className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-sm shadow-sm">
                                                    <span className="font-bold text-slate-800 mr-1">{v.word}</span>
                                                    <span className="text-slate-500 text-xs">{v.meaning}</span>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
