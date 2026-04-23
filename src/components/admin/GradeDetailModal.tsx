'use client';

import StructureEditor, { parseAnalysisString } from '@/components/student/StructureEditor';
import { Submission, Assignment, dbService } from '@/services/db';
import { toast } from 'sonner';

interface GradeDetailModalProps {
    viewDetail: Submission;
    assignments: Assignment[];
    onClose: () => void;
    onPrint: () => void;
    onDataReload: () => void;
}

export default function GradeDetailModal({ viewDetail, assignments, onClose, onPrint, onDataReload }: GradeDetailModalProps) {
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col">
                {/* Modal Header */}
                <div className={`p-6 border-b border-slate-100 flex justify-between items-center ${viewDetail.status === 'pending_review' ? 'bg-orange-50' : viewDetail.attempt === 0 ? 'bg-slate-50' : 'bg-slate-50'}`}>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            {viewDetail.status === 'pending_review' ? (
                                <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-[10px] font-bold uppercase tracking-wider">Review Required</span>
                            ) : viewDetail.attempt === 0 ? (
                                <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider">Approved Selection</span>
                            ) : (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white ${viewDetail.score >= 80 ? 'bg-green-500' : 'bg-red-500'}`}>
                                    {viewDetail.score >= 80 ? 'Passed' : 'Failed'}
                                </span>
                            )}
                            <span className="text-sm font-bold text-slate-400">{viewDetail.attempt === 0 ? '단어 선택' : `${viewDetail.attempt}회 시도`}</span>
                        </div>
                        <h3 className={`text-xl font-bold ${viewDetail.status === 'pending_review' ? 'text-orange-900' : 'text-slate-800'}`}>
                            {viewDetail.status === 'pending_review' || viewDetail.attempt === 0 ? '선택한 단어 목록' : viewDetail.assignmentTitle}
                        </h3>
                        <p className={`text-sm mt-1 ${viewDetail.status === 'pending_review' ? 'text-orange-700' : 'text-slate-500'}`}>
                            {viewDetail.status === 'pending_review' || viewDetail.attempt === 0
                                ? `${viewDetail.studentName} 학생이 선택한 ${viewDetail.answers?.length || 0}개의 단어`
                                : `${viewDetail.studentName} 학생 | 점수: ${viewDetail.score}점`
                            }
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                {/* Modal Content */}
                <div className="p-0 overflow-y-auto flex-1 bg-white">
                    {viewDetail.status === 'pending_review' || viewDetail.attempt === 0 ? (
                        // --- Content for Pending Review (Word Selection) ---
                        <div className="p-6 space-y-3">
                            {viewDetail.answers?.map((word: any, idx: number) => (
                                <div key={idx} className="flex gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-orange-200 transition-colors">
                                    <div className="w-8 h-8 flex items-center justify-center bg-white rounded-full text-slate-400 text-xs font-bold border border-slate-200 shadow-sm">
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-base font-bold text-slate-800">{word.term}</span>
                                            <span className="text-sm text-slate-500">{word.meaning}</span>
                                        </div>
                                        {word.contextSentence && (
                                            <p className="text-xs text-slate-400 bg-white p-2 rounded-lg border border-slate-100 italic">
                                                &quot;{word.contextSentence}&quot;
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        // --- Content for Result Report (Structure or Vocab) ---
                        <div className="flex flex-col h-full">
                            {/* Stats Summary */}
                            <div className="grid grid-cols-3 gap-1 bg-slate-50 p-4 border-b border-slate-100">
                                <div className="text-center p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase">Score</div>
                                    <div className={`text-2xl font-black ${viewDetail.score >= 80 ? 'text-green-500' : 'text-red-500'}`}>{viewDetail.score}</div>
                                </div>
                                <div className="text-center p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase">Wrong</div>
                                    <div className="text-2xl font-black text-slate-700">{(viewDetail.details || []).filter(d => d.score < 80).length}</div>
                                </div>
                                <div className="text-center p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase">Correct</div>
                                    <div className="text-2xl font-black text-slate-700 text-opacity-40">{(viewDetail.details || []).filter(d => d.score >= 80).length}</div>
                                </div>
                            </div>

                            {/* Detailed List */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/50">
                                {(viewDetail.details || []).map((detail, idx) => {
                                    const assignment = assignments.find(a => a.id === viewDetail.assignmentId);
                                    const type = assignment?.type || 'structure';

                                    if (type === 'transform') {
                                        // --- Transform (Variant Problem) Detail View ---
                                        const problem = assignment?.variantProblems?.[idx];
                                        const studentAnswer = viewDetail.answers?.[idx];
                                        const isCorrect = studentAnswer === problem?.correctAnswer;

                                        return (
                                            <div key={idx} className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 ${!isCorrect ? 'ring-1 ring-red-100' : ''}`}>
                                                <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-100">
                                                    <h4 className="font-bold text-slate-700 flex items-center gap-2">
                                                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm ${isCorrect ? 'bg-[#1e3a5f]' : 'bg-red-500'}`}>
                                                            {idx + 1}
                                                        </span>
                                                        <span className="text-lg">변형문제 {idx + 1} ({problem?.type})</span>
                                                    </h4>
                                                    <span className={`text-sm font-black ${isCorrect ? 'text-[#1e3a5f]' : 'text-red-500'}`}>
                                                        {isCorrect ? '정답' : '정답'}
                                                    </span>
                                                </div>

                                                <div className="mb-6">
                                                    <p className="text-slate-800 font-medium mb-4 leading-relaxed" dangerouslySetInnerHTML={{ __html: problem?.question || '' }} />

                                                    <div className="space-y-2">
                                                        {problem?.choices.map((choice, cIdx) => {
                                                            const isStudentChoice = studentAnswer === cIdx;
                                                            const isCorrectChoice = problem.correctAnswer === cIdx;

                                                            let choiceStyle = 'bg-white border-slate-200 text-slate-600';
                                                            if (isCorrectChoice) choiceStyle = 'bg-green-50 border-green-200 text-green-700 font-bold';
                                                            if (isStudentChoice && !isCorrectChoice) choiceStyle = 'bg-red-50 border-red-200 text-red-700 font-bold';

                                                            return (
                                                                <div key={cIdx} className={`p-3 rounded-lg border flex items-center gap-3 text-sm transition-colors ${choiceStyle}`}>
                                                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${isCorrectChoice ? 'bg-green-500 text-white border-green-500' : isStudentChoice ? 'bg-red-500 text-white border-red-500' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                                                                        {cIdx + 1}
                                                                    </span>
                                                                    <span>{choice}</span>
                                                                    {isCorrectChoice && <span className="ml-auto text-[10px] uppercase font-black tracking-widest text-green-600">Correct</span>}
                                                                    {isStudentChoice && !isCorrectChoice && <span className="ml-auto text-[10px] uppercase font-black tracking-widest text-red-500">Your Pick</span>}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {problem?.explanation && (
                                                    <div className="p-4 bg-[#1e3a5f]/10 rounded-xl border border-[#1e3a5f]/20">
                                                        <div className="text-xs font-bold text-[#1e3a5f] uppercase mb-2">정답 해설</div>
                                                        <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{problem.explanation}</p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }

                                    // --- Existing Structure Analysis Detail View ---
                                    const rawSentence = assignment?.sentences?.[idx] || '';
                                    const sentenceText = typeof rawSentence === 'string' ? rawSentence : rawSentence.original;
                                    const studentAnswer = viewDetail.answers?.[idx];

                                    return (
                                        <div key={idx} className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 ${detail.score < 80 ? 'ring-1 ring-red-100' : ''}`}>
                                            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                                                <h4 className="font-bold text-slate-700 flex items-center gap-2">
                                                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm ${detail.score >= 80 ? 'bg-green-500' : 'bg-red-500'}`}>
                                                        {idx + 1}
                                                    </span>
                                                    <span className="text-lg">Sentence {idx + 1}</span>
                                                </h4>
                                                <span className={`text-xl font-black ${detail.score >= 80 ? 'text-green-600' : 'text-red-500'}`}>
                                                    {detail.score}점                                                </span>
                                            </div>

                                            {/* Student Analysis Visualization */}
                                            <div className="mb-6">
                                                <div className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                                    학생의 분석 (Student)
                                                </div>
                                                <div className="pointer-events-none p-4 rounded-xl bg-slate-50 border border-slate-200 relative overflow-hidden">
                                                    <StructureEditor
                                                        text={sentenceText}
                                                        initialMarks={studentAnswer?.marks || []}
                                                        readOnly={true}
                                                    />
                                                </div>
                                            </div>

                                            {/* Correct Structure Visualization */}
                                            {detail.correctStructure && (
                                                <div className="mb-6">
                                                    <div className="text-xs font-bold text-green-600 mb-2 uppercase tracking-wide flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                                        정답 구조 (Correct)
                                                    </div>
                                                    <div className="pointer-events-none p-4 rounded-xl bg-green-50/30 border border-green-100 relative overflow-hidden">
                                                        <StructureEditor
                                                            text={sentenceText}
                                                            initialMarks={parseAnalysisString(sentenceText, detail.correctStructure)}
                                                            readOnly={true}
                                                        />
                                                        <p className="mt-3 pt-3 border-t border-green-100/50 text-green-800 text-sm font-medium opacity-80 font-serif">
                                                            {detail.correctStructure}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Translations */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                    <div className="text-xs font-bold text-slate-400 uppercase mb-2">학생 해석</div>
                                                    <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                                                        {studentAnswer?.translation || '(입력되지 않음)'}
                                                    </p>
                                                </div>
                                                {detail.directTranslation && (
                                                    <div className="bg-[#1e3a5f]/10 p-4 rounded-xl border border-[#1e3a5f]/20">
                                                        <div className="text-xs font-bold text-[#1e3a5f]/70 uppercase mb-2">직독직해</div>
                                                        <p className="text-[#1e3a5f] text-sm leading-relaxed">
                                                            {detail.directTranslation}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Feedback */}
                                            {detail.feedback && (
                                                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                                    <div className="text-xs font-bold text-blue-500 uppercase mb-2">AI 피드백</div>
                                                    <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{detail.feedback}</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center gap-3">
                    <div className="text-xs text-slate-400">
                        {viewDetail.id}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-all shadow-sm"
                        >
                            닫기
                        </button>

                        {viewDetail.status === 'pending_review' ? (
                            <>
                                <button
                                    onClick={async () => {
                                        if (confirm('반려하시겠습니까? 기존 제출 기록이 삭제되고 학생이 다시 선택해야 합니다.')) {
                                            await dbService.deleteSubmission(viewDetail.id);
                                            toast.success('반려 및 기록이 삭제되었습니다.');
                                            onClose();
                                            await onDataReload();
                                        }
                                    }}
                                    className="px-5 py-2.5 bg-red-100 text-red-600 font-bold rounded-xl hover:bg-red-200 transition-colors"
                                >
                                    반려
                                </button>
                                <button
                                    onClick={async () => {
                                        if (confirm('승인하시겠습니까?')) {
                                            await dbService.updateSubmissionStatus(viewDetail.id, 'approved');
                                            toast.success('승인되었습니다.');
                                            onClose();
                                            await onDataReload();
                                        }
                                    }}
                                    className="px-6 py-2.5 bg-orange-500 text-white font-bold rounded-xl shadow-lg hover:bg-orange-600 transition-all"
                                >
                                    승인하기
                                </button>
                            </>
                        ) : viewDetail.attempt === 0 ? null : (
                            // Print Button for Graded Result
                            <button
                                onClick={onPrint}
                                className="px-5 py-2.5 bg-slate-800 text-white font-bold hover:bg-slate-700 rounded-xl transition-all shadow-lg flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                                정답시트 출력
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
