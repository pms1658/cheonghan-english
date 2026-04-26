'use client';

/**
 * 4번 그림 문제 수능 스타일 SVG 렌더러
 * pictureElements 데이터를 기반으로 방/장면 일러스트를 생성
 * 실제 수능처럼 간단한 선화(line art) + 번호표기 스타일
 */

interface PictureElement {
    number: string;  // "①", "②", etc.
    item: string;    // "Banner saying 'Welcome New Members'"
    position: string; // "top-center", "left", etc.
}

interface PictureRendererProps {
    elements: PictureElement[];
    description?: string;
}

// Simple icon mapping based on keywords
function getIcon(item: string): string {
    const lower = item.toLowerCase();
    // Furniture
    if (lower.includes('table') || lower.includes('desk')) return '🪑';
    if (lower.includes('chair') || lower.includes('seat')) return '💺';
    if (lower.includes('sofa') || lower.includes('couch')) return '🛋️';
    if (lower.includes('bed')) return '🛏️';
    if (lower.includes('shelf') || lower.includes('bookshelf')) return '📚';
    if (lower.includes('cabinet') || lower.includes('drawer')) return '🗄️';
    // Wall items
    if (lower.includes('clock')) return '🕐';
    if (lower.includes('banner') || lower.includes('sign') || lower.includes('poster')) return '📋';
    if (lower.includes('painting') || lower.includes('picture') || lower.includes('frame')) return '🖼️';
    if (lower.includes('mirror')) return '🪞';
    if (lower.includes('board') || lower.includes('whiteboard') || lower.includes('blackboard')) return '📝';
    if (lower.includes('calendar')) return '📅';
    if (lower.includes('map')) return '🗺️';
    // Electronics
    if (lower.includes('laptop') || lower.includes('computer')) return '💻';
    if (lower.includes('monitor') || lower.includes('screen') || lower.includes('tv')) return '🖥️';
    if (lower.includes('phone') || lower.includes('telephone')) return '📱';
    if (lower.includes('speaker') || lower.includes('microphone')) return '🔊';
    if (lower.includes('camera')) return '📷';
    if (lower.includes('projector')) return '📽️';
    if (lower.includes('lamp') || lower.includes('light')) return '💡';
    // Nature/Plants
    if (lower.includes('plant') || lower.includes('flower') || lower.includes('pot')) return '🪴';
    if (lower.includes('tree')) return '🌳';
    // Objects
    if (lower.includes('globe')) return '🌍';
    if (lower.includes('trophy') || lower.includes('award') || lower.includes('cup')) return '🏆';
    if (lower.includes('book')) return '📗';
    if (lower.includes('box') || lower.includes('package')) return '📦';
    if (lower.includes('bag') || lower.includes('backpack')) return '🎒';
    if (lower.includes('umbrella')) return '☂️';
    if (lower.includes('hat') || lower.includes('cap')) return '🧢';
    if (lower.includes('cushion') || lower.includes('pillow')) return '🟫';
    if (lower.includes('rug') || lower.includes('carpet') || lower.includes('mat')) return '🟨';
    if (lower.includes('curtain') || lower.includes('window')) return '🪟';
    if (lower.includes('door')) return '🚪';
    if (lower.includes('star')) return '⭐';
    if (lower.includes('flag')) return '🚩';
    if (lower.includes('ribbon') || lower.includes('bow')) return '🎀';
    if (lower.includes('ball') || lower.includes('soccer') || lower.includes('basketball')) return '⚽';
    if (lower.includes('guitar') || lower.includes('instrument') || lower.includes('piano')) return '🎸';
    if (lower.includes('basket')) return '🧺';
    if (lower.includes('vase')) return '🏺';
    if (lower.includes('food') || lower.includes('cake') || lower.includes('fruit')) return '🍰';
    if (lower.includes('coffee') || lower.includes('cup') || lower.includes('mug')) return '☕';
    return '📌';
}

// Position to SVG coordinates (9-grid layout)
function getCoords(position: string, idx: number): { x: number; y: number } {
    const gridPositions: Record<string, { x: number; y: number }> = {
        'top-left': { x: 80, y: 60 },
        'top-center': { x: 230, y: 60 },
        'top-right': { x: 380, y: 60 },
        'left': { x: 80, y: 160 },
        'center': { x: 230, y: 160 },
        'right': { x: 380, y: 160 },
        'bottom-left': { x: 80, y: 260 },
        'bottom-center': { x: 230, y: 260 },
        'bottom-right': { x: 380, y: 260 },
    };
    // Fallback positions for unknown positions
    const fallbacks = [
        { x: 80, y: 80 }, { x: 380, y: 80 },
        { x: 80, y: 240 }, { x: 380, y: 240 },
        { x: 230, y: 160 },
    ];
    return gridPositions[position] || fallbacks[idx % 5];
}

export default function PictureRenderer({ elements, description }: PictureRendererProps) {
    if (!elements || elements.length === 0) return null;

    return (
        <div className="border-2 border-slate-800 rounded-lg bg-white overflow-hidden w-full">
            <svg
                viewBox="0 0 460 320"
                className="w-full h-auto"
            >
                {/* Background - room outline */}
                <rect x="20" y="20" width="420" height="280" rx="4"
                    fill="#fafafa" stroke="#cbd5e1" strokeWidth="1.5" />
                
                {/* Floor line */}
                <line x1="20" y1="230" x2="440" y2="230" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,4" />
                
                {/* Wall line */}
                <line x1="20" y1="110" x2="440" y2="110" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="2,4" />

                {/* Render each element */}
                {elements.map((el, idx) => {
                    const { x, y } = getCoords(el.position, idx);
                    const icon = getIcon(el.item);
                    
                    return (
                        <g key={idx}>
                            {/* Element background circle */}
                            <circle cx={x} cy={y} r="32" fill="white" stroke="#94a3b8" strokeWidth="1.5" />
                            
                            {/* Icon */}
                            <text x={x} y={y - 2} textAnchor="middle" dominantBaseline="middle"
                                fontSize="24">{icon}</text>
                            
                            {/* Number badge */}
                            <circle cx={x + 22} cy={y - 22} r="11" fill="#1e293b" />
                            <text x={x + 22} y={y - 22} textAnchor="middle" dominantBaseline="middle"
                                fill="white" fontSize="11" fontWeight="bold">
                                {el.number.replace(/[①②③④⑤]/, (m: string) => {
                                    const map: Record<string, string> = {'①':'1','②':'2','③':'3','④':'4','⑤':'5'};
                                    return map[m] || m;
                                })}
                            </text>
                            
                            {/* Label */}
                            <text x={x} y={y + 38} textAnchor="middle" dominantBaseline="middle"
                                fill="#475569" fontSize="8" fontWeight="600">
                                {el.item.length > 25 ? el.item.slice(0, 22) + '...' : el.item}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}
