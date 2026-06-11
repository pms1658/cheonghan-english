
import React from 'react';

interface AnalysisSentenceRendererProps {
    text: string;
}

const TAG_STYLES: Record<string, { label: string; underline: string; labelColor: string; bg: string }> = {
    S:    { label: 'S',    underline: 'border-blue-500',   labelColor: 'text-blue-600',   bg: 'bg-blue-50' },
    V:    { label: 'V',    underline: 'border-red-500',    labelColor: 'text-red-600',    bg: 'bg-red-50' },
    O:    { label: 'O',    underline: 'border-green-500',  labelColor: 'text-green-600',  bg: 'bg-green-50' },
    C:    { label: 'C',    underline: 'border-orange-500', labelColor: 'text-orange-600', bg: 'bg-orange-50' },
    Conn: { label: 'Conn', underline: 'border-slate-400',  labelColor: 'text-slate-600',  bg: 'bg-slate-50' },
};

export const AnalysisSentenceRenderer: React.FC<AnalysisSentenceRendererProps> = ({ text }) => {
    if (!text) return null;

    // Parse [TAG]content[/TAG], (content), <content>, and plain text
    const parts: { type: string; content: string }[] = [];
    const tagRegex = /\[([A-Za-z]+)\]([\s\S]*?)\[\/\1\]|\(([^)]*)\)|<([^>]*)>/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tagRegex.exec(text)) !== null) {
        // Plain text before match
        if (match.index > lastIndex) {
            parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
        }
        if (match[1]) {
            // [TAG]content[/TAG]
            parts.push({ type: match[1].toUpperCase() === 'CONN' ? 'Conn' : match[1].toUpperCase(), content: match[2] });
        } else if (match[3] !== undefined) {
            // (content) — modifier
            parts.push({ type: 'paren', content: `(${match[3]})` });
        } else if (match[4] !== undefined) {
            // <content> — special
            parts.push({ type: 'angle', content: `<${match[4]}>` });
        }
        lastIndex = match.index + match[0].length;
    }
    // Remaining text
    if (lastIndex < text.length) {
        parts.push({ type: 'text', content: text.slice(lastIndex) });
    }

    return (
        <span className="leading-loose" style={{ fontFamily: "'Pretendard', 'Apple SD Gothic Neo', -apple-system, BlinkMacSystemFont, sans-serif" }}>
            {parts.map((part, idx) => {
                const style = TAG_STYLES[part.type];
                if (style) {
                    return (
                        <span key={idx} className="relative inline-block mx-0.5 pb-1">
                            <span className={`border-b-2 ${style.underline}`}>{part.content}</span>
                            <span className={`absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-bold ${style.labelColor} ${style.bg} px-1 rounded whitespace-nowrap`}>
                                {style.label}
                            </span>
                        </span>
                    );
                }
                if (part.type === 'paren') {
                    return <span key={idx} className="text-slate-400 text-sm mx-0.5">{part.content}</span>;
                }
                if (part.type === 'angle') {
                    return <span key={idx} className="text-indigo-500 bg-indigo-50 rounded px-1 mx-0.5 border border-indigo-100 text-sm">{part.content}</span>;
                }
                return <span key={idx}>{part.content}</span>;
            })}
        </span>
    );
};
