'use client';

import { Assignment } from '@/types';
import { AssignmentWithStats } from './useClassRoom';
import { toast } from 'sonner';

/**
 * Print-related handlers extracted from useClassRoom.
 * Keeps print logic separate from core classroom state management.
 */
export function useClassPrint({
    assignments,
    selectedAssignments,
    allSubmissions,
    isPrintModalOpen, setIsPrintModalOpen,
    printTitle, setPrintTitle,
    printStudentId, setPrintStudentId,
}: {
    assignments: AssignmentWithStats[];
    selectedAssignments: Set<string>;
    allSubmissions: any[];
    isPrintModalOpen: boolean;
    setIsPrintModalOpen: (v: boolean) => void;
    printTitle: string;
    setPrintTitle: (v: string) => void;
    printStudentId: string;
    setPrintStudentId: (v: string) => void;
}) {
    const handlePrint = (studentName: string, submissionId: string) => {
        const submission = allSubmissions.find(s => s.id === submissionId);
        if (!submission) return;

        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) return;

        const failedItems = submission.aiAnalysis?.filter((item: any) => item.score < 100) || [];

        const htmlContent = `
            <html>
            <head>
                <title>${studentName} - 오답 노트</title>
                <style>
                    body { font-family: 'Malgun Gothic', sans-serif; padding: 40px; }
                    h1 { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 30px; }
                    .meta { margin-bottom: 40px; color: #666; font-size: 14px; }
                    .item { margin-bottom: 30px; border: 1px solid #eee; padding: 20px; border-radius: 8px; }
                    .score { color: #e11d48; font-weight: bold; }
                    .sentence { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
                    .analysis { color: #475569; margin-bottom: 10px; }
                    .feedback { background: #f8fafc; padding: 10px; border-radius: 4px; color: #4b5563; font-size: 14px; }
                    @media print {
                        body { padding: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <h1>오답 노트 / 지도 자료</h1>
                <div class="meta">
                    <strong>학생:</strong> ${studentName}<br>
                    <strong>과제:</strong> ${submission.assignmentTitle}<br>
                    <strong>일시:</strong> ${new Date(submission.submittedAt).toLocaleString()}
                </div>

                ${failedItems.length > 0 ? failedItems.map((item: any, idx: number) => `
                    <div class="item">
                        <div class="sentence">Q${idx + 1}. (점수: <span class="score">${item.score}</span>)</div>
                        <div class="analysis">
                            <strong>[정답 구조]</strong><br>
                            ${item.correctStructure || '정보 없음'}
                        </div>
                        <div class="feedback">
                            <strong>[피드백]</strong><br>
                            ${item.feedback || '피드백 없음'}
                        </div>
                    </div>
                `).join('') : '<p>오답 데이터가 없거나 모든 문장을 통과했습니다.</p>'}

                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    const handleDirectPrint = () => {
        const selAssignments = assignments.filter(a => selectedAssignments.has(a.id));
        const hasSelection = selAssignments.some(a => a.type === 'selection');
        
        if (hasSelection) {
            setPrintTitle('');
            setPrintStudentId('all');
            setIsPrintModalOpen(true);
            return;
        }
        
        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) return;

        let transformContent = '';
        let vocabContent = '';
        let answerKeyContent = '';

        const formatQ = (text: string) => {
            if (!text) return '';
            return text.replace(/\r/g, '').replace(/\[\[BOX\]\]\s*\n?/gi, "<div class='box-sentence'>").replace(/\n?\s*\[\[\/BOX\]\]\n?/gi, "</div>").replace(/\[\[TARGET\]\]\s*\n?/gi, "<div class='target-sentence'>").replace(/\n?\s*\[\[\/TARGET\]\]\n?/gi, "</div>").replace(/\[\[U\]\]/gi, "<u>").replace(/\[\[\/U\]\]/gi, "</u>").replace(/\[\[BR\]\]/gi, "<br/>");
        };
        const circled = ['\u2460','\u2461','\u2462','\u2463','\u2464'];

        // Transform
        const transformAssignments = selAssignments.filter(a => a.type === 'transform');
        if (transformAssignments.length > 0) {
            let allSectionsHtml = '';
            transformAssignments.forEach((a: any) => {
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
            transformAssignments.forEach((a: any) => {
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

        // Vocab
        const vocabAssignments = selAssignments.filter(a => a.type === 'vocabulary');
        if (vocabAssignments.length > 0) {
            vocabAssignments.forEach((a: any) => {
                if (!a.words || a.words.length === 0) return;
                const rows = a.words.map((w: any, i: number) => `<tr><td>${i + 1}</td><td class="term">${w.term}</td><td>${w.meaning}</td></tr>`).join('');
                vocabContent += `<div class="vocab-section"><h3>${a.title}</h3><table class="vocab-table"><thead><tr><th>No.</th><th>단어</th><th>뜻</th></tr></thead><tbody>${rows}</tbody></table></div>`;
            });
        }

        const htmlContent = `<!DOCTYPE html><html><head><title>과제 인쇄</title><style>
            @page { size: A4; margin: 15mm; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Malgun Gothic', sans-serif; color: #1d1d1f; font-size: 10pt; line-height: 1.4; }
            .print-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #0A0E27; padding-bottom: 10px; margin-bottom: 16px; }
            .print-header-left { display: flex; align-items: center; gap: 10px; }
            .print-logo { width: 40px; height: 40px; background: #083973; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
            .print-logo img { width: 100%; height: 100%; object-fit: contain; filter: brightness(0) invert(1); }
            .print-header-title { font-size: 14pt; font-weight: 900; color: #1d1d1f; }
            .print-header-sub { font-size: 8pt; color: #86868b; margin-top: 2px; }
            .print-title { text-align: center; font-size: 16pt; font-weight: 900; border-bottom: 2px solid #1d1d1f; padding-bottom: 8px; margin-bottom: 16px; }
            .two-col { column-count: 2; column-gap: 20px; column-rule: 1px solid #e5e5e7; }
            .problem { break-inside: avoid; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px dotted #d2d2d7; }
            .problem-header { font-weight: 900; font-size: 10pt; margin-bottom: 4px; }
            .problem-question { font-size: 9.5pt; margin-bottom: 6px; line-height: 1.5; white-space: pre-wrap; }
            .problem-choices { font-size: 9pt; }
            .choice { margin-bottom: 2px; line-height: 1.4; }
            .assignment-section { break-inside: avoid-column; margin-bottom: 16px; }
            .assignment-title { font-size: 11pt; font-weight: 900; border-bottom: 2px solid #1d1d1f; padding-bottom: 4px; margin-bottom: 10px; }
            .type-badge { display: inline-block; font-size: 8pt; font-weight: 700; color: #636366; background: #f5f5f7; border: 1px solid #d2d2d7; border-radius: 4px; padding: 1px 6px; margin-left: 4px; }
            .box-sentence, .target-sentence { border: 1px solid #aaa; padding: 6px 8px; margin: 4px 0; border-radius: 4px; background: #f8f8f8; font-size: 9pt; }
            u { text-decoration: underline; text-underline-offset: 2px; }
            .answer-key { break-before: page; margin-top: 30px; padding-top: 20px; }
            .answer-box { border: 2px solid #1d1d1f; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; }
            .answer-box-title { font-size: 12pt; font-weight: 900; margin-bottom: 8px; border-bottom: 1px solid #d2d2d7; padding-bottom: 4px; }
            .answer-grid { column-count: 5; font-size: 10pt; font-weight: 600; }
            .answer-grid span { display: block; margin-bottom: 4px; }
            .answer-detail { margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px dotted #d2d2d7; break-inside: avoid; }
            .detail-header { font-size: 10pt; font-weight: 800; margin-bottom: 4px; }
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
                        <div class="print-header-title">변형문제</div>
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
    };

    return { handlePrint, handleDirectPrint };
}
