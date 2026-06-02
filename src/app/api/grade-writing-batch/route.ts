import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';
import { apiGuard, createErrorResponse, validateRequest } from '@/lib/apiMiddleware';
import { gradeWritingBatchRequestSchema } from '@/schemas/api';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
    const blocked = apiGuard(req);
    if (blocked) return blocked;

    try {
        const body = await req.json();
        validateRequest(gradeWritingBatchRequestSchema, body, 'grade-writing-batch');
        const { problems, targetGrammar, level } = body;

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'API Key missing' }, { status: 500 });
        }

        if (!Array.isArray(problems) || problems.length === 0) {
            return NextResponse.json({ error: 'No problems provided' }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({
            model: 'gemini-3.5-flash',
            generationConfig: { responseMimeType: 'application/json' }
        });

        const problemsText = problems.map((p: any, i: number) => 
            `### ë¬¸ì œ ${i + 1}
- ?œêµ­?? ${p.korean}
- ?•ë‹µ ?ˆì‹œ: ${p.correctAnswer}
- ?™ìƒ ?µì•ˆ: ${p.studentAnswer}
- ?µì‹¬ ë¬¸ë²•: ${p.keyGrammar}`
        ).join('\n\n');

        const prompt = `?¹ì‹ ?€ ?œêµ­ ê³ ë“±?™êµ ?ì–´ ?´ì‹  ì±„ì  êµì‚¬?…ë‹ˆ?? ?„ë˜ ${problems.length}ê°??ì‘ ë¬¸ì œë¥??œêº¼ë²ˆì— ì±„ì ?´ì£¼?¸ìš”.

## ê³¼ì œ ?•ë³´
- ëª©í‘œ êµ¬ë¬¸: ${targetGrammar}
- ?œì´?? ${level}

## ì±„ì ??ë¬¸ì œ??

${problemsText}

## ì±„ì  ê¸°ì? (100??ë§Œì , ë¬¸ì œ??
1. **êµ¬ë¬¸ ?•í™•??(40??**: ëª©í‘œ êµ¬ë¬¸???•í™•???¬ìš©?ˆëŠ”ê°€?
2. **ë¬¸ë²• ?•í™•??(30??**: ?œì œ, ?˜ì¼ì¹? ê´€?? ?„ì¹˜????ë¬¸ë²•??ë§ëŠ”ê°€?
3. **?˜ë? ?„ë‹¬ (20??**: ?œêµ­???˜ë?ê°€ ?•í™•???„ë‹¬?˜ì—ˆ?”ê??
4. **?ì—°?¤ëŸ¬?€ (10??**: ?ì–´ë¡œì„œ ?ì—°?¤ëŸ¬???œí˜„?¸ê??

## ì±„ì  ?ì¹™
- ?•ë‹µê³??„ì „???¤ë¥¸ êµ¬ë¬¸???¬ìš©?ˆìœ¼ë©?êµ¬ë¬¸ ?ìˆ˜??0??
- ?•ë‹µê³??¤ë¥¸ ?œí˜„?´ë¼??ë¬¸ë²•?ìœ¼ë¡?ë§ê³  ?˜ë?ê°€ ê°™ìœ¼ë©?ê´€?€?˜ê²Œ ì±„ì 
- ?¬ì†Œ??ê´€???„ì¹˜???¤ìˆ˜???½ê°„ë§?ê°ì  (-5~10??
- ?µì‹¬ êµ¬ë¬¸??êµ¬ì¡°???¤ë¥˜???¬ê²Œ ê°ì  (-20~40??
- ?µì•ˆ??ë¹„ì–´?ˆê±°???˜ë??†ëŠ” ?µì´ë©?0??

## ?¼ë“œë°?ê°€?´ë“œ
- ë°˜ë“œ???œêµ­?´ë¡œ ?‘ì„±
- ì¹œì ˆ?˜ê³  ê²©ë ¤?˜ëŠ” ?¤ìœ¼ë¡?
- ?˜í•œ ?ì„ ë¨¼ì? ?¸ê¸‰?˜ê³ , ê°œì„ ?ì„ ?Œë ¤ì£¼ê¸°

## ?‘ë‹µ ?•ì‹ (JSON)
{
  "results": [
    {
      "score": number,
      "feedback": "?œêµ­???¼ë“œë°?(2-3ë¬¸ì¥)",
      "correctedSentence": "?˜ì •???•ë‹µ ë¬¸ì¥",
      "grammarNotes": "?µì‹¬ ë¬¸ë²• ?¬ì¸????ì¤??¤ëª…"
    }
  ]
}

results ë°°ì—´?€ ë°˜ë“œ??${problems.length}ê°œì—¬???©ë‹ˆ?? ë¬¸ì œ ?œì„œ?€ë¡?ì±„ì ?´ì£¼?¸ìš”.`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
            const parsed = JSON.parse(cleaned);
            
            if (!Array.isArray(parsed.results) || parsed.results.length !== problems.length) {
                console.error('[GradeWritingBatch] Result count mismatch:', parsed.results?.length, 'vs', problems.length);
                // Try to pad or trim
                const results = Array.isArray(parsed.results) ? parsed.results : [];
                while (results.length < problems.length) {
                    results.push({ score: 0, feedback: 'ì±„ì  ?¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.', correctedSentence: '', grammarNotes: '' });
                }
                return NextResponse.json({ results: results.slice(0, problems.length) });
            }

            // Sanitize each result
            const sanitized = parsed.results.map((r: any) => ({
                score: typeof r.score === 'number' ? Math.min(100, Math.max(0, r.score)) : 0,
                feedback: typeof r.feedback === 'string' ? r.feedback : String(r.feedback || ''),
                correctedSentence: typeof r.correctedSentence === 'string' ? r.correctedSentence : String(r.correctedSentence || ''),
                grammarNotes: typeof r.grammarNotes === 'string' ? r.grammarNotes : String(r.grammarNotes || ''),
            }));

            return NextResponse.json({ results: sanitized });
        } catch {
            console.error('[GradeWritingBatch] JSON parse error:', cleaned);
            return NextResponse.json({ error: 'Failed to parse AI response', raw: cleaned }, { status: 500 });
        }
    } catch (error) {
        return createErrorResponse(error, 'Failed to grade writing batch');
    }
}
