
import React from 'react';

interface AnalysisSentenceRendererProps {
    text: string; // Text with [S]...[/S] tags
}

export const AnalysisSentenceRenderer: React.FC<AnalysisSentenceRendererProps> = ({ text }) => {
    // Regex to parse tags: [Tag]Content[/Tag] or (Content) or <Content>
    // We need to split and map
    // Order matters. We can use a unified regex.
    // Tags: S, V, O, C, Conn
    // Brackets: (), <>, []

    if (!text) return null;

    // 1. First, let's handle the specific labeled tags [S], [V], [O], [C], [Conn]
    // We can replace them with span placeholders or parse them into a tree.
    // Simple approach: Split by regex and render.

    const parts = text.split(/(\[[SVOC]|\[Conn\]).*?\[\/[SVOC]|\[\/Conn\]\]|(\(.*?\))|(<.*?>)/g).filter(Boolean);

    return (
        <span className="leading-loose text-lg" style={{ fontFamily: "'Pretendard', 'Apple SD Gothic Neo', -apple-system, BlinkMacSystemFont, sans-serif" }}>
            {parts.map((part, idx) => {
                // Check if it's a tag
                if (part.startsWith('[S]')) {
                    const content = part.replace('[S]', '').replace('[/S]', '');
                    return (
                        <span key={idx} className="relative inline-block mx-1">
                            <span className="border-b-2 border-blue-500 pb-0.5">{content}</span>
                            <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-bold text-blue-600 bg-blue-50 px-1 rounded">S</span>
                        </span>
                    );
                }
                if (part.startsWith('[V]')) {
                    const content = part.replace('[V]', '').replace('[/V]', '');
                    return (
                        <span key={idx} className="relative inline-block mx-1">
                            <span className="border-b-2 border-red-500 pb-0.5">{content}</span>
                            <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-bold text-red-600 bg-red-50 px-1 rounded">V</span>
                        </span>
                    );
                }
                if (part.startsWith('[O]')) {
                    const content = part.replace('[O]', '').replace('[/O]', '');
                    return (
                        <span key={idx} className="relative inline-block mx-1">
                            <span className="border-b-2 border-green-500 pb-0.5">{content}</span>
                            <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-bold text-green-600 bg-green-50 px-1 rounded">O</span>
                        </span>
                    );
                }
                if (part.startsWith('[C]')) {
                    const content = part.replace('[C]', '').replace('[/C]', '');
                    return (
                        <span key={idx} className="relative inline-block mx-1">
                            <span className="border-b-2 border-orange-500 pb-0.5">{content}</span>
                            <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-bold text-orange-600 bg-orange-50 px-1 rounded">C</span>
                        </span>
                    );
                }
                if (part.startsWith('[Conn]')) {
                    const content = part.replace('[Conn]', '').replace('[/Conn]', '');
                    return (
                        <span key={idx} className="inline-block border border-slate-400 px-1 mx-1 rounded bg-slate-50 text-slate-700 text-sm align-middle">
                            □ {content}
                        </span>
                    );
                }
                if (part.startsWith('(') && part.endsWith(')')) {
                    return <span key={idx} className="text-slate-500 bg-slate-100 rounded px-1 mx-0.5">{part}</span>;
                }
                if (part.startsWith('<') && part.endsWith('>')) {
                    return <span key={idx} className="text-indigo-600 bg-indigo-50 rounded px-1 mx-0.5 border border-indigo-100">{part}</span>;
                }

                return <span key={idx}>{part}</span>;
            })}
        </span>
    );
};
