'use client';

import React from 'react';

interface PrintModalProps {
    isOpen: boolean;
    onClose: () => void;
    assignments: any[];
    selectedAssignments: Set<string>;
    allSubmissions: any[];
    currentClassStudents: any[];
    printTitle: string;
    setPrintTitle: (v: string) => void;
    printStudentId: string;
    setPrintStudentId: (v: string) => void;
}

export default function PrintModal({
    isOpen,
    onClose,
    assignments,
    selectedAssignments,
    allSubmissions,
    currentClassStudents,
    printTitle,
    setPrintTitle,
    printStudentId,
    setPrintStudentId
}: PrintModalProps) {

    const selAssignments = assignments.filter(a => selectedAssignments.has(a.id));
    const hasTransform = selAssignments.some(a => a.type === 'transform');
    const hasSelection = selAssignments.some(a => a.type === 'selection');

    if (!isOpen) return null;

    const handleExecutePrint = () => {
        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) return;

        let transformContent = '';
        let vocabContent = '';
        let answerKeyContent = '';

        // --- Transform Problems (grouped by assignment) ---
        const transformAssignments = selAssignments.filter(a => a.type === 'transform');
        if (transformAssignments.length > 0) {
            const formatQ = (text: string) => {
                if (!text) return '';
                return text.replace(/\r/g, '').replace(/\[\[BOX\]\]\s*\n?/gi, "<div class='box-sentence'>").replace(/\n?\s*\[\[\/BOX\]\]\n?/gi, "</div>").replace(/\[\[TARGET\]\]\s*\n?/gi, "<div class='target-sentence'>").replace(/\n?\s*\[\[\/TARGET\]\]\n?/gi, "</div>").replace(/\[\[U\]\]/gi, "<u>").replace(/\[\[\/U\]\]/gi, "</u>").replace(/\[\[BR\]\]/gi, "<br/>");
            };
            const circled = ['\u2460','\u2461','\u2462','\u2463','\u2464'];

            let allSectionsHtml = '';
            transformAssignments.forEach(a => {
                const probs = a.variantProblems || [];
                if (probs.length === 0) return;
                allSectionsHtml += `<div class="assignment-section"><div class="assignment-title">${a.title}</div>`;
                allSectionsHtml += probs.map((p: any, idx: number) => {
                    const typeLabel = p.type ? `<span class="type-badge">${p.type}</span>` : '';
                    return `<div class="problem"><div class="problem-header">${idx + 1}. ${typeLabel}</div><div class="problem-question">${formatQ(p.question)}</div><div class="problem-choices">${p.choices.map((c: string, ci: number) => `<div class="choice">${circled[ci]} ${c}</div>`).join('')}</div></div>`;
                }).join('');
                allSectionsHtml += '</div>';
            });
            transformContent = `<div class="two-col">${allSectionsHtml}</div>`;

            let allAnswerHtml = '';
            transformAssignments.forEach(a => {
                const probs = a.variantProblems || [];
                if (probs.length === 0) return;
                const boxHtml = '<div class="answer-box"><div class="answer-box-title">' + a.title + ' \u2014 \uc815\ub2f5</div><div class="answer-grid">' + probs.map((p: any, idx: number) => '<span>' + (idx + 1) + '. ' + circled[p.correctAnswer] + '</span>').join('') + '</div></div>';
                const detailHtml = probs.map((p: any, idx: number) => {
                    const tl = p.type ? ' [' + p.type + ']' : '';
                    const expl = p.explanation || '';
                    return '<div class="answer-detail"><div class="detail-header">' + (idx + 1) + '\ubc88' + tl + ' \u2014 \uc815\ub2f5: ' + circled[p.correctAnswer] + '</div>' + (expl ? '<div class="explanation">' + expl + '</div>' : '') + '</div>';
                }).join('');
                allAnswerHtml += boxHtml + '<div class="detail-section">' + detailHtml + '</div>';
            });
            answerKeyContent = '<div class="answer-key">' + allAnswerHtml + '</div>';
        }

        // --- Vocabulary ---
        const vocabAssignments = selAssignments.filter(a => a.type === 'vocabulary');
        if (vocabAssignments.length > 0) {
            vocabAssignments.forEach(a => {
                if (!a.words || a.words.length === 0) return;
                const rows = a.words.map((w: any, i: number) => `<tr><td>${i + 1}</td><td class="term">${w.term}</td><td>${w.meaning}</td></tr>`).join('');
                vocabContent += `<div class="vocab-section"><h3>${a.title}</h3><table class="vocab-table"><thead><tr><th>No.</th><th>단어</th><th>뜻</th></tr></thead><tbody>${rows}</tbody></table></div>`;
            });
        }

        // --- Selection (student-specific) ---
        const selectionAssignments = selAssignments.filter(a => a.type === 'selection');
        if (selectionAssignments.length > 0) {
            selectionAssignments.forEach(a => {
                if (!a.words || a.words.length === 0) return;
                let wordsToShow = a.words;

                if (printStudentId !== 'all') {
                    const studentSubs = allSubmissions.filter(
                        s => s.assignmentId === a.id && s.studentId === printStudentId && (s.status === 'approved' || s.status === 'pending_review')
                    );
                    const selSub = studentSubs.find(s => s.details?.[0]?.selectedIndices);
                    if (selSub) {
                        const indices: number[] = selSub.details[0].selectedIndices;
                        wordsToShow = a.words.filter((_: any, i: number) => indices.includes(i));
                    }
                }

                const studentName = printStudentId !== 'all'
                    ? currentClassStudents.find(s => s.id === printStudentId)?.name || ''
                    : '';
                const titleSuffix = studentName ? ` (${studentName})` : '';

                const rows = wordsToShow.map((w: any, i: number) => `<tr><td>${i + 1}</td><td class="term">${w.term}</td><td>${w.meaning}</td></tr>`).join('');
                vocabContent += `<div class="vocab-section"><h3>${a.title}${titleSuffix}</h3><table class="vocab-table"><thead><tr><th>No.</th><th>단어</th><th>뜻</th></tr></thead><tbody>${rows}</tbody></table></div>`;
            });
        }

        const htmlContent = `<!DOCTYPE html><html><head><title>${printTitle || '과제 인쇄'}</title><style>
            @page { size: A4; margin: 15mm; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; color: #1d1d1f; font-size: 10pt; line-height: 1.4; }
            .print-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #0A0E27; padding-bottom: 10px; margin-bottom: 16px; }
            .print-header-left { display: flex; align-items: center; gap: 10px; }
            .print-logo { width: 40px; height: 40px; background: #083973; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
            .print-logo img { width: 100%; height: 100%; object-fit: contain; filter: brightness(0) invert(1); }
            .print-header-title { font-size: 14pt; font-weight: 900; color: #1d1d1f; }
            .print-header-sub { font-size: 8pt; color: #86868b; margin-top: 2px; }
            .print-title { text-align: center; font-size: 16pt; font-weight: 900; border-bottom: 2px solid #1d1d1f; padding-bottom: 8px; margin-bottom: 16px; }
            .print-subtitle { text-align: center; font-size: 9pt; color: #86868b; margin-bottom: 20px; }
            .two-col { column-count: 2; column-gap: 20px; column-rule: 1px solid #e5e5e7; }
            .problem { break-inside: avoid; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px dotted #d2d2d7; }
            .problem-header { font-weight: 900; font-size: 10pt; margin-bottom: 4px; color: #1d1d1f; }
            .problem-question { font-size: 9.5pt; margin-bottom: 6px; line-height: 1.5; white-space: pre-wrap; }
            .problem-choices { font-size: 9pt; }
            .choice { margin-bottom: 2px; line-height: 1.4; }
            .assignment-section { break-inside: avoid-column; margin-bottom: 16px; }
            .assignment-title { font-size: 11pt; font-weight: 900; color: #1d1d1f; border-bottom: 2px solid #1d1d1f; padding-bottom: 4px; margin-bottom: 10px; }
            .type-badge { display: inline-block; font-size: 8pt; font-weight: 700; color: #636366; background: #f5f5f7; border: 1px solid #d2d2d7; border-radius: 4px; padding: 1px 6px; margin-left: 4px; vertical-align: middle; }
            .detail-section { margin-bottom: 20px; }
            .box-sentence, .target-sentence { border: 1px solid #aaa; padding: 6px 8px; margin: 4px 0; border-radius: 4px; background: #f8f8f8; font-size: 9pt; }
            u { text-decoration: underline; text-underline-offset: 2px; }
            .answer-key { break-before: page; margin-top: 30px; padding-top: 20px; }
            .answer-box { border: 2px solid #1d1d1f; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; }
            .answer-box-title { font-size: 12pt; font-weight: 900; margin-bottom: 8px; border-bottom: 1px solid #d2d2d7; padding-bottom: 4px; }
            .answer-grid { column-count: 5; font-size: 10pt; font-weight: 600; }
            .answer-grid span { display: block; margin-bottom: 4px; }
            .detail-title { font-size: 13pt; font-weight: 900; margin-bottom: 12px; border-bottom: 2px solid #1d1d1f; padding-bottom: 6px; }
            .answer-detail { margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px dotted #d2d2d7; break-inside: avoid; }
            .detail-header { font-size: 10pt; font-weight: 800; color: #1d1d1f; margin-bottom: 4px; }
            .explanation { font-size: 9pt; color: #424245; line-height: 1.6; background: #f5f5f7; padding: 8px 12px; border-radius: 6px; white-space: pre-wrap; }
            .vocab-section { break-inside: avoid; margin-bottom: 20px; }
            .vocab-section h3 { font-size: 13pt; font-weight: 800; margin-bottom: 8px; border-bottom: 1px solid #1d1d1f; padding-bottom: 4px; }
            .vocab-table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
            .vocab-table th { background: #f5f5f7; text-align: left; padding: 5px 8px; border: 1px solid #d2d2d7; font-size: 8pt; font-weight: 700; }
            .vocab-table td { padding: 4px 8px; border: 1px solid #e5e5e7; }
            .vocab-table td.term { font-weight: 700; }
            .name-line { text-align: right; font-size: 10pt; color: #86868b; }
            .print-footer { text-align: center; font-size: 7pt; color: #aeaeb2; margin-top: 30px; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style></head><body>
            <div class="print-header">
                <div class="print-header-left">
                    <div class="print-logo"><img src="/logo.svg" alt="logo" onerror="this.parentElement.innerHTML='청한'" /></div>
                    <div>
                        <div class="print-header-title">${printTitle || '변형문제'}</div>
                        <div class="print-header-sub">CheongHan English</div>
                    </div>
                </div>
                <div class="name-line">이름: ________________</div>
            </div>
            ${transformContent}
            ${answerKeyContent}
            ${vocabContent}
            <div class="print-footer">CheongHan English Institute | ${new Date().toLocaleDateString('ko-KR')}</div>
            <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); }<\/script>
        </body></html>`;

        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">🖨️ 과제 인쇄</h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">인쇄 제목 (선택)</label>
                        <input
                            type="text"
                            placeholder="예: 3월 2주차 변형문제"
                            value={printTitle}
                            onChange={e => setPrintTitle(e.target.value)}
                            className="w-full p-3 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none text-sm font-bold"
                        />
                    </div>

                    {/* Student selector for selection type */}
                    {hasSelection && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">학생 선택 (단어선택 과제)</label>
                            <select
                                value={printStudentId}
                                onChange={e => setPrintStudentId(e.target.value)}
                                className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:outline-none"
                            >
                                <option value="all">전체 단어 (원본)</option>
                                {(() => {
                                    const selIds = selAssignments.filter(a => a.type === 'selection').map(a => a.id);
                                    const submittedStudents = new Map<string, string>();
                                    allSubmissions
                                        .filter(s => selIds.includes(s.assignmentId) && (s.status === 'approved' || s.status === 'pending_review'))
                                        .forEach(s => {
                                            const name = currentClassStudents.find(st => st.id === s.studentId)?.name;
                                            if (name) submittedStudents.set(s.studentId, name);
                                        });
                                    return Array.from(submittedStudents.entries()).map(([id, name]) => (
                                        <option key={id} value={id}>{name}의 선택 내역</option>
                                    ));
                                })()}
                            </select>
                        </div>
                    )}

                    {/* Summary */}
                    <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500 space-y-1">
                        <div className="font-bold text-slate-700 mb-1">선택된 과제 ({selAssignments.length}개)</div>
                        {selAssignments.map(a => (
                            <div key={a.id} className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${
                                    a.type === 'transform' ? 'bg-blue-500' : a.type === 'vocabulary' ? 'bg-blue-400' : 'bg-blue-300'
                                }`} />
                                <span>{a.title}</span>
                                <span className="text-slate-400">({a.type === 'transform' ? `${(a.variantProblems || []).length}문제` : `${(a.words || []).length}단어`})</span>
                            </div>
                        ))}
                        {hasTransform && (
                            <div className="mt-2 text-[10px] text-slate-400 border-t border-slate-200 pt-2">
                                변형문제: 2단 레이아웃, 정답지 별도 포함
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-6 flex gap-2">
                    <button
                        onClick={handleExecutePrint}
                        className="flex-1 bg-[#1e3a5f] text-white py-3 rounded-xl font-bold hover:bg-[#2a4d75] transition-colors flex items-center justify-center gap-2"
                    >
                        🖨️ 인쇄하기
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-3 bg-slate-100 text-slate-500 rounded-xl font-bold hover:bg-slate-200"
                    >
                        취소
                    </button>
                </div>
            </div>
        </div>
    );
}
