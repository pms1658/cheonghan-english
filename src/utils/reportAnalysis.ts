/**
 * Report Analysis Utilities
 * Analyze student submissions to generate vocabulary, grammar, and reading scores.
 */

import { Submission, Assignment, StudentReport } from '@/types';
import { getSessionById } from '@/data/writingModules';

interface AnalysisInput {
    submissions: Submission[];
    assignments: Assignment[];
    studentId: string;
    studentName: string;
    classId: string;
    yearMonth: string;  // '2026-04' (for storage key)
    startDate?: string; // '2026-04-01' (optional: explicit range)
    endDate?: string;   // '2026-04-30'
}

/**
 * Main analysis function - generates all report data from raw submissions
 */
export function analyzeStudentData(input: AnalysisInput): Omit<StudentReport, 'id' | 'createdAt' | 'status' | 'tenantId' | 'aiSummary'> {
    const { submissions, assignments, studentId, studentName, classId, yearMonth, startDate, endDate } = input;

    // Build assignment lookup
    const assignmentMap = new Map<string, Assignment>();
    assignments.forEach(a => assignmentMap.set(a.id, a));

    // Filter submissions by date range
    let rangeStart: number;
    let rangeEnd: number;

    if (startDate && endDate) {
        rangeStart = new Date(startDate).getTime();
        // endDate is inclusive — add 1 day
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        rangeEnd = end.getTime();
    } else {
        rangeStart = new Date(yearMonth + '-01').getTime();
        const nextMonth = new Date(yearMonth + '-01');
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        rangeEnd = nextMonth.getTime();
    }

    const monthSubs = submissions.filter(s => {
        const ts = s.timestamp || (typeof s.submittedAt === 'number' ? s.submittedAt : 0);
        return ts >= rangeStart && ts < rangeEnd;
    });

    // Categorize submissions
    const vocabSubs: Submission[] = [];
    const writingSubs: Submission[] = [];
    const structureSubs: Submission[] = [];

    for (const sub of monthSubs) {
        const assignment = assignmentMap.get(sub.assignmentId);
        if (!assignment) continue;

        if (assignment.type === 'selection' || (assignment.type === 'vocabulary' && assignment.parentAssignmentId)) {
            // 개인단어 과제 (selection에서 파생된 vocabulary)
            vocabSubs.push(sub);
        } else if (assignment.type === 'writing' || (sub as any).type === 'writing_session') {
            writingSubs.push(sub);
        } else if (assignment.type === 'structure') {
            structureSubs.push(sub);
        }
    }

    // All-time data for cumulative stats
    const allVocabSubs = submissions.filter(s => {
        const a = assignmentMap.get(s.assignmentId);
        return a && (a.type === 'selection' || (a.type === 'vocabulary' && a.parentAssignmentId));
    });

    const vocab = analyzeVocabulary(vocabSubs, allVocabSubs, assignmentMap);
    const grammar = analyzeGrammar(writingSubs, structureSubs, assignmentMap);
    const reading = analyzeReading(structureSubs, assignmentMap);
    const growth = analyzeGrowth(vocab, grammar, reading, submissions, assignmentMap, yearMonth);

    return {
        studentId,
        studentName,
        classId,
        yearMonth,
        vocabScore: vocab.score,
        grammarScore: grammar.score,
        readingScore: reading.score,
        vocab: vocab.details,
        grammar: grammar.details,
        reading: reading.details,
        growth,
    };
}

// ─── Vocabulary Analysis ───

function analyzeVocabulary(
    monthSubs: Submission[],
    allSubs: Submission[],
    assignmentMap: Map<string, Assignment>
) {
    // Group by assignment to find vocab test results
    const byAssignment = new Map<string, Submission[]>();
    monthSubs.forEach(s => {
        const list = byAssignment.get(s.assignmentId) || [];
        list.push(s);
        byAssignment.set(s.assignmentId, list);
    });

    let totalAttempts = 0;
    let passedAssignments = 0;
    let firstTryPasses = 0;
    let totalAssignments = 0;
    let monthlyWords = 0;
    const recentWords: string[] = [];

    byAssignment.forEach((subs, assignmentId) => {
        const assignment = assignmentMap.get(assignmentId);
        if (!assignment) return;

        // Only count actual vocab test submissions (not selection submissions)
        const testSubs = subs.filter(s => s.attempt > 0 && s.score !== undefined);
        if (testSubs.length === 0) return;

        totalAssignments++;
        const sorted = testSubs.sort((a, b) => a.attempt - b.attempt);
        totalAttempts += sorted.length;

        // Check if passed (100 score)
        const passed = sorted.some(s => s.score >= 100);
        if (passed) {
            passedAssignments++;
            // Count words
            const wordCount = assignment.words?.length || 0;
            monthlyWords += wordCount;
        }

        // First try pass
        if (sorted[0]?.score >= 100) {
            firstTryPasses++;
        }

        // Collect recent words
        if (assignment.words) {
            assignment.words.slice(0, 3).forEach(w => {
                if (recentWords.length < 10) recentWords.push(w.term);
            });
        }
    });

    // Cumulative total
    const allByAssignment = new Map<string, Submission[]>();
    allSubs.forEach(s => {
        const list = allByAssignment.get(s.assignmentId) || [];
        list.push(s);
        allByAssignment.set(s.assignmentId, list);
    });
    let totalWordsLearned = 0;
    allByAssignment.forEach((subs, assignmentId) => {
        const assignment = assignmentMap.get(assignmentId);
        if (!assignment) return;
        const passed = subs.some(s => s.score >= 100);
        if (passed) totalWordsLearned += (assignment.words?.length || 0);
    });

    const avgAttempts = totalAssignments > 0 ? Math.round((totalAttempts / totalAssignments) * 10) / 10 : 0;
    const firstTryRate = totalAssignments > 0 ? Math.round((firstTryPasses / totalAssignments) * 100) : 0;

    // Score calculation: weighted combination
    // 첫 시도 통과율이 높고, 시도 횟수가 적을수록 높은 점수
    let score = 0;
    if (totalAssignments > 0) {
        const passRate = passedAssignments / totalAssignments;
        const efficiencyBonus = Math.max(0, 100 - (avgAttempts - 1) * 15);
        score = Math.round(passRate * 60 + firstTryRate * 0.2 + Math.min(efficiencyBonus * 0.2, 20));
        score = Math.min(100, Math.max(0, score));
    }

    return {
        score,
        details: {
            totalWordsLearned,
            monthlyWordsLearned: monthlyWords,
            avgAttemptsToPass: avgAttempts,
            firstTryPassRate: firstTryRate,
            recentWords,
        }
    };
}

// ─── Grammar Analysis ───

function analyzeGrammar(
    writingSubs: Submission[],
    structureSubs: Submission[],
    assignmentMap: Map<string, Assignment>
) {
    // === Part 1: 구조작문 (productive grammar) ===
    const bySession = new Map<number, { scores: number[]; title: string }>();

    writingSubs.forEach(sub => {
        const assignment = assignmentMap.get(sub.assignmentId);
        const sessionId = assignment?.writingConfig?.sessionId;
        if (!sessionId) return;

        const session = getSessionById(sessionId);
        if (!session) return;

        const existing = bySession.get(sessionId) || { scores: [], title: session.title };
        existing.scores.push(sub.score);
        bySession.set(sessionId, existing);
    });

    const weakSessions: { title: string; score: number }[] = [];
    const strongSessions: { title: string; score: number }[] = [];
    let writingTotalScore = 0;
    let writingCount = 0;

    bySession.forEach(({ scores, title }) => {
        const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        writingTotalScore += avg;
        writingCount++;

        if (avg < 70) weakSessions.push({ title, score: avg });
        if (avg >= 90) strongSessions.push({ title, score: avg });
    });

    weakSessions.sort((a, b) => a.score - b.score);
    strongSessions.sort((a, b) => b.score - a.score);

    const writingAvg = writingCount > 0 ? Math.round(writingTotalScore / writingCount) : 0;
    const passedCount = Array.from(bySession.values()).filter(
        v => v.scores.some(s => s >= 90)
    ).length;

    // === Part 2: 구조독해 기호분석 (analytical grammar) ===
    let structureGrammarTotal = 0;
    let structureGrammarCount = 0;

    structureSubs.forEach(sub => {
        // 구조독해 점수 = 기호표시(문법 구조 분석) 정확도
        if (sub.score > 0) {
            structureGrammarTotal += sub.score;
            structureGrammarCount++;
        }
    });

    const structureAvg = structureGrammarCount > 0 ? Math.round(structureGrammarTotal / structureGrammarCount) : 0;

    // === Combined Score ===
    // 구조작문(생산적 문법) 60% + 구조독해 기호분석(분석적 문법) 40%
    let combinedScore = 0;
    if (writingCount > 0 && structureGrammarCount > 0) {
        combinedScore = Math.round(writingAvg * 0.6 + structureAvg * 0.4);
    } else if (writingCount > 0) {
        combinedScore = writingAvg;
    } else if (structureGrammarCount > 0) {
        combinedScore = structureAvg;
    }

    return {
        score: combinedScore,
        details: {
            sessionsAttempted: bySession.size,
            sessionsPassed: passedCount,
            avgFirstAttemptScore: writingAvg,
            weakSessions: weakSessions.slice(0, 5),
            strongSessions: strongSessions.slice(0, 5),
            structureAnalysisAvg: structureAvg,
            structureAnalysisCount: structureGrammarCount,
        }
    };
}

// ─── Reading Analysis ───

function analyzeReading(
    structureSubs: Submission[],
    assignmentMap: Map<string, Assignment>
) {
    let withTranslation = 0;
    let structureOnly = 0;
    let totalReadingScore = 0;
    const scoreHistory: { date: string; score: number; title: string }[] = [];

    structureSubs.forEach(sub => {
        const assignment = assignmentMap.get(sub.assignmentId);
        if (!assignment) return;

        // Check if translation exists in answers
        const answers = sub.answers || [];
        const hasTranslation = answers.some((a: any) => {
            if (a?.value?.translation && typeof a.value.translation === 'string') {
                return a.value.translation.trim().length > 0;
            }
            return false;
        });

        const ts = sub.timestamp || (typeof sub.submittedAt === 'number' ? sub.submittedAt : 0);

        if (hasTranslation) {
            withTranslation++;
            totalReadingScore += sub.score;
            scoreHistory.push({
                date: new Date(ts).toISOString().slice(0, 10),
                score: sub.score,
                title: assignment.title || `과제 ${sub.assignmentId.slice(0, 6)}`,
            });
        } else {
            structureOnly++;
        }
    });

    const avgScore = withTranslation > 0 ? Math.round(totalReadingScore / withTranslation) : 0;

    // Sort history by date
    scoreHistory.sort((a, b) => a.date.localeCompare(b.date));

    return {
        score: avgScore,
        details: {
            totalSubmissions: structureSubs.length,
            withTranslation,
            avgScore,
            structureOnlyCount: structureOnly,
            scoreHistory,
        }
    };
}

// ─── Growth Analysis ───

function analyzeGrowth(
    vocab: { score: number; details: any },
    grammar: { score: number; details: any },
    reading: { score: number; details: any },
    allSubmissions: Submission[],
    assignmentMap: Map<string, Assignment>,
    currentMonth: string
): StudentReport['growth'] {
    // Compare with previous month
    const prevDate = new Date(currentMonth + '-01');
    prevDate.setMonth(prevDate.getMonth() - 1);
    const prevMonth = prevDate.toISOString().slice(0, 7);

    // Simple trend heuristic: if we have data, compare monthly averages
    // For now, use the current month's performance indicators
    const vocabTrend: 'up' | 'stable' | 'down' =
        vocab.details.firstTryPassRate >= 70 ? 'up' :
            vocab.details.firstTryPassRate >= 40 ? 'stable' : 'down';

    const grammarTrend: 'up' | 'stable' | 'down' =
        grammar.details.avgFirstAttemptScore >= 80 ? 'up' :
            grammar.details.avgFirstAttemptScore >= 60 ? 'stable' : 'down';

    const readingTrend: 'up' | 'stable' | 'down' =
        reading.details.avgScore >= 80 ? 'up' :
            reading.details.avgScore >= 60 ? 'stable' : 'down';

    // Auto-detect improvement areas
    const improvements: string[] = [];

    if (vocab.score < 60) {
        improvements.push(`어휘: 첫 시도 통과율 ${vocab.details.firstTryPassRate}%로 개선 필요. 플래시카드 학습 시간을 늘려보세요.`);
    }

    if (grammar.details.weakSessions.length > 0) {
        const weakNames = grammar.details.weakSessions.map((s: any) => s.title).join(', ');
        improvements.push(`문법: ${weakNames} 구문의 정확도가 낮습니다. 해당 구문의 공식을 다시 확인해보세요.`);
    }

    if (reading.details.avgScore > 0 && reading.details.avgScore < 70) {
        improvements.push(`독해: 구조독해 평균 ${reading.details.avgScore}점으로 해석 정확도 향상이 필요합니다.`);
    }

    if (reading.details.withTranslation === 0 && reading.details.totalSubmissions > 0) {
        improvements.push(`독해: 기호 분석은 잘 하고 있으나, 해석까지 포함한 학습을 병행하면 좋겠습니다.`);
    }

    if (improvements.length === 0) {
        improvements.push('전 영역에서 고르게 성장하고 있습니다! 현재 학습 패턴을 유지해주세요.');
    }

    return { vocabTrend, grammarTrend, readingTrend, improvements };
}
