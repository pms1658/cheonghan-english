'use client';

import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';

// 마킹 타입 정의: 동사, 준명사, 종속절, 수식어, 접속사
type MarkType = 'verb' | 'nominal' | 'clause' | 'modifier' | 'conjunction';

interface Mark {
    id: string;
    type: MarkType;
    start: number; // 시작 단어 인덱스
    end: number;   // 끝 단어 인덱스
}

interface WordToken {
    id: number;
    text: string;
}

export default function StructureAnalysisDemo() {
    // 예시 문장 (5가지 기호 모두 사용 가능한 복잡한 문장)
    const sentenceText = "Although the new system / which we developed / works efficiently (in most cases) and looks great, detailed testing is still required.";
    const [tokens, setTokens] = useState<WordToken[]>(() =>
        sentenceText.split(' ').map((text, idx) => ({ id: idx, text }))
    );

    // 마킹 데이터
    const [marks, setMarks] = useState<Mark[]>([]);
    const [history, setHistory] = useState<Mark[][]>([]); // 실행 취소 기록

    // 선택 상태 (범위)
    const [selectedRange, setSelectedRange] = useState<{ start: number, end: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // 스타일 정의 Layout (유저 요청 컬러 반영)
    const MARK_STYLES = {
        verb: { label: '동사 (V)', shortcut: 'V', color: 'border-red-600', text: 'text-red-600' },
        nominal: { label: '준명사 /.../', shortcut: '/', color: 'text-amber-500', text: 'text-amber-500' }, // 노랑/주황 계열
        conjunction: { label: '접속사 △', shortcut: '△', color: 'text-red-500', text: 'text-red-500' }, // 빨강
        clause: { label: '종속절 <...>', shortcut: '<>', color: 'text-green-600', text: 'text-green-600' }, // 초록
        modifier: { label: '수식어 (...)', shortcut: '( )', color: 'text-indigo-500', text: 'text-indigo-500' }, // 그 외 (파랑/남색)
    };

    // ----- 선택 로직 (클릭 & 드래그) -----

    // 단어 클릭 시: 해당 단어 하나만 선택
    const handleWordClick = (idx: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedRange({ start: idx, end: idx });
    };

    // 드래그 종료 시: 범위 선택
    const handleMouseUp = () => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;

        if (!containerRef.current?.contains(sel.anchorNode)) return;

        const getIndex = (node: Node | null): number | null => {
            let current = node;
            while (current && current !== containerRef.current) {
                if (current instanceof HTMLElement && current.dataset.index) {
                    return parseInt(current.dataset.index, 10);
                }
                current = current.parentNode;
            }
            return null;
        };

        const startIdx = getIndex(sel.anchorNode);
        const endIdx = getIndex(sel.focusNode);

        if (startIdx !== null && endIdx !== null) {
            const start = Math.min(startIdx, endIdx);
            const end = Math.max(startIdx, endIdx);
            setSelectedRange({ start, end });
            sel.removeAllRanges(); // 브라우저 기본 선택 하이라이트 제거
        }
    };

    // 배경 클릭 시: 선택 해제
    const clearSelection = () => {
        setSelectedRange(null);
    };

    // ----- 마킹 적용/삭제/Undo 로직 -----

    const saveHistory = () => {
        setHistory(prev => [...prev, marks]);
    };

    const undo = () => {
        if (history.length === 0) return;
        const previous = history[history.length - 1];
        setMarks(previous);
        setHistory(prev => prev.slice(0, -1));
    };

    const applyMark = (type: MarkType) => {
        if (!selectedRange) {
            toast.warning("먼저 단어를 선택해주세요!");
            return;
        }

        saveHistory(); // 변경 전 저장

        const newMark: Mark = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            start: selectedRange.start,
            end: selectedRange.end
        };

        setMarks([...marks, newMark]);
        setSelectedRange(null); // 적용 후 선택 해제
    };

    const removeMark = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        saveHistory(); // 변경 전 저장
        setMarks(marks.filter(m => m.id !== id));
    };

    // ----- 렌더링 헬퍼 -----
    const getMarksForToken = (idx: number) => {
        return marks.filter(m => m.start <= idx && m.end >= idx);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center relative" onMouseDown={clearSelection} onMouseUp={handleMouseUp}>

            <div className="max-w-4xl w-full mt-10 mb-32 bg-white rounded-3xl shadow-xl border border-slate-200 overflow-visible relative" style={{ zIndex: 1 }}>

                {/* Header */}
                <div className="bg-[#0A0E27] p-8 text-white rounded-t-3xl select-none">
                    <h1 className="text-2xl font-bold mb-2">구조독해 분석기 V7 (Final Styling)</h1>
                    <p className="text-blue-200 text-sm">
                        1. 단어를 <span className="text-yellow-300 font-bold">클릭</span>하거나 <span className="text-yellow-300 font-bold">드래그</span>해서 선택하세요.<br />
                        2. 툴바를 이용해 기호를 표시하세요. 삭제는 마커에 커서를 올리면 나옵니다.
                    </p>
                </div>

                {/* Analysis Area */}
                <div
                    ref={containerRef}
                    className="p-16 min-h-[400px] flex flex-wrap gap-y-14 gap-x-3 text-3xl font-medium leading-loose items-center justify-center bg-white rounded-b-3xl"
                >
                    {tokens.map((token, idx) => {
                        const isSelected = selectedRange && idx >= selectedRange.start && idx <= selectedRange.end;
                        const tokenMarks = getMarksForToken(idx);

                        // 마킹 상태 확인
                        const isVerb = tokenMarks.some(m => m.type === 'verb');
                        const isConjunction = tokenMarks.some(m => m.type === 'conjunction');

                        // 배경색 처리를 위한 마킹 확인 (Clause vs Modifier)
                        const isClause = tokenMarks.some(m => m.type === 'clause');
                        const isModifier = tokenMarks.some(m => m.type === 'modifier');

                        // 배경색 결정
                        let bgClass = '';
                        if (isModifier) bgClass = 'bg-slate-100/80'; // 수식어: 회색
                        else if (isClause) bgClass = 'bg-green-50/60'; // 종속절: 초록색 (요청 반영)

                        // [Overlay Visuals]
                        const opens = marks
                            .filter(m => m.start === idx && ['nominal', 'clause', 'modifier'].includes(m.type))
                            .sort((a, b) => (b.end - b.start) - (a.end - a.start));

                        const closes = marks
                            .filter(m => m.end === idx && ['nominal', 'clause', 'modifier'].includes(m.type))
                            .sort((a, b) => (b.end - b.start) - (a.end - a.start));

                        // ✨ Dynamic Spacing Logic ✨
                        const MARK_WIDTH = 14;
                        const pl = opens.length * MARK_WIDTH;
                        const pr = closes.length * MARK_WIDTH;

                        return (
                            <div
                                key={token.id}
                                className={`relative group/word flex items-center h-16 transition-all duration-200 ${bgClass}`}
                                style={{
                                    zIndex: isSelected ? 10 : 1,
                                    paddingLeft: `${pl}px`,
                                    paddingRight: `${pr}px`,
                                    marginLeft: '4px',
                                    marginRight: '4px',
                                    borderRadius: '8px'
                                }}
                            >

                                {/* --- [Overlay Layer] --- */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 20 }}>

                                    {/* (1) 동사 밑줄: 빨강 */}
                                    {isVerb && (
                                        <div className="absolute bottom-2 w-full border-b-[3px] border-red-500/80"></div>
                                    )}

                                    {/* (2) 접속사 세모: 빨강 (높이 70%) */}
                                    {isConjunction && (
                                        <div className="absolute inset-0 flex items-center justify-center -top-2">
                                            <svg width="120%" height="70%" viewBox="0 0 100 100" preserveAspectRatio="none" className="overflow-visible text-red-500 opacity-80">
                                                <polygon
                                                    points="50,0 100,100 0,100"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="8"
                                                    strokeLinejoin="round"
                                                />
                                            </svg>
                                        </div>
                                    )}

                                    {/* (3) 여는 기호 */}
                                    {opens.map((m, i) => {
                                        // 색상을 타입에 따라 결정
                                        const color = MARK_STYLES[m.type].text;
                                        const leftPos = i * MARK_WIDTH;
                                        return (
                                            <div
                                                key={m.id + 'open'}
                                                className={`absolute top-1/2 -translate-y-1/2 text-3xl font-extrabold ${color}`}
                                                style={{ left: `${leftPos}px`, textAlign: 'center', width: `${MARK_WIDTH}px` }}
                                            >
                                                {m.type === 'nominal' ? '/' : m.type === 'clause' ? '<' : '('}
                                            </div>
                                        );
                                    })}

                                    {/* (4) 닫는 기호 */}
                                    {closes.map((m, i) => {
                                        const color = MARK_STYLES[m.type].text;
                                        const rightPos = i * MARK_WIDTH;
                                        return (
                                            <div
                                                key={m.id + 'close'}
                                                className={`absolute top-1/2 -translate-y-1/2 text-3xl font-extrabold ${color}`}
                                                style={{ right: `${rightPos}px`, textAlign: 'center', width: `${MARK_WIDTH}px` }}
                                            >
                                                {m.type === 'nominal' ? '/' : m.type === 'clause' ? '>' : ')'}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* --- [Text Layer] --- */}
                                <span
                                    data-index={idx}
                                    onMouseDown={(e) => handleWordClick(idx, e)}
                                    className={`
                                        relative px-1 rounded cursor-pointer transition-all duration-100 select-text block z-10
                                        ${isSelected ? 'bg-blue-200 text-blue-900 ring-2 ring-blue-400' : 'hover:bg-black/5'}
                                    `}
                                >
                                    {token.text}
                                </span>

                                {/* --- [Hover Controls] --- */}
                                <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 hidden group-hover/word:flex gap-1 z-30 bg-white/90 backdrop-blur shadow-xl rounded-lg p-1.5 border border-slate-200 min-w-max before:content-[''] before:absolute before:-top-6 before:left-0 before:w-full before:h-6 before:bg-transparent">
                                    {tokenMarks.length === 0 && <span className="text-[10px] text-slate-400">No marks</span>}
                                    {tokenMarks.map(m => (
                                        <button
                                            key={m.id}
                                            onMouseDown={(e) => removeMark(m.id, e)}
                                            className={`text-[10px] px-2 py-1 rounded font-bold whitespace-nowrap flex items-center gap-1 hover:opacity-80 transition-all text-white shadow-sm
                                                ${m.type === 'verb' ? 'bg-red-500' :
                                                    m.type === 'conjunction' ? 'bg-purple-500' :
                                                        'bg-slate-600'
                                                }`}
                                            style={['nominal', 'clause', 'modifier'].includes(m.type) ? {
                                                backgroundColor: '#64748b'
                                            } : {}}
                                        >
                                            {m.type === 'verb' ? 'V' : m.type === 'conjunction' ? '△' :
                                                m.type === 'nominal' ? '/.../' : m.type === 'clause' ? '<...>' : '( ... )'}
                                            <span className="text-[10px] opacity-70 ml-1">x</span>
                                        </button>
                                    ))}
                                </div>

                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Fixed Bottom Toolbar */}
            <div
                onMouseDown={(e) => e.stopPropagation()}
                className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-md border border-slate-200 shadow-2xl rounded-2xl p-4 flex gap-4 z-50 animate-slideUp items-center"
            >
                <div className="flex items-center gap-2 px-2 border-r border-slate-200 pr-4">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Markup<br />Tools</span>
                </div>
                {(Object.keys(MARK_STYLES) as MarkType[]).map((type) => (
                    <button
                        key={type}
                        onClick={() => applyMark(type)}
                        className={`
                            flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all duration-200
                            ${selectedRange ? 'hover:bg-slate-50 hover:scale-110 active:scale-95 cursor-pointer opacity-100 ring-2 ring-transparent hover:ring-slate-200' : 'opacity-40 cursor-not-allowed grayscale'}
                        `}
                    >
                        <div className={`text-2xl font-extrabold mb-1 ${MARK_STYLES[type].text}`}>
                            {MARK_STYLES[type].shortcut}
                        </div>
                        <div className="text-[10px] font-bold text-slate-600">
                            {MARK_STYLES[type].label.split(' ')[0]}
                        </div>
                    </button>
                ))}

                {/* Undo Button */}
                <div className="w-px h-10 bg-slate-200 mx-2"></div>
                <button
                    onClick={undo}
                    disabled={history.length === 0}
                    className={`
                         flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all duration-200
                         ${history.length > 0 ? 'hover:bg-slate-50 hover:text-slate-900 active:scale-95 text-slate-500' : 'opacity-30 cursor-not-allowed text-slate-300'}
                    `}
                >
                    <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                    <div className="text-[10px] font-bold">Undo</div>
                </button>
            </div>
        </div>
    );
}
