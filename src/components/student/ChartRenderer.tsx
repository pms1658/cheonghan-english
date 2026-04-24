'use client';

/**
 * 수능 스타일 도표 렌더러 (다양한 차트 유형 지원)
 * - bar: 막대 그래프 (수직 바, 긴 라벨은 회전 처리)
 * - line: 꺾은선 그래프
 * - pie: 원 그래프
 * - table: 표 형식
 * - stacked_bar: 누적 막대 그래프
 */

interface ChartData {
    title: string;
    type?: 'bar' | 'line' | 'pie' | 'table' | 'stacked_bar';
    labels: string[];
    datasets: { label: string; data: (number | string)[] }[];
    unit?: string;
    source?: string;
}

interface ChartRendererProps {
    chartData: ChartData;
}

// Grayscale palette for CSAT style
const COLORS = ['#a0a0a0', '#404040', '#707070', '#c0c0c0', '#252525'];
const LINE_COLORS = ['#333333', '#888888', '#555555', '#aaaaaa'];
const PIE_COLORS = ['#e0e0e0', '#b0b0b0', '#808080', '#505050', '#303030', '#d0d0d0'];
const MARKERS = ['●', '■', '▲', '◆', '○'];

export default function ChartRenderer({ chartData }: ChartRendererProps) {
    const { title, labels, datasets, unit = '', source } = chartData;
    const chartType = chartData.type || 'bar';

    // Determine if data is numeric
    const isNumeric = datasets.every(ds => ds.data.every(v => typeof v === 'number' || !isNaN(Number(v))));

    // ══════════════════════════════════════
    // TABLE
    // ══════════════════════════════════════
    if (chartType === 'table' || !isNumeric) {
        const circleNums = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'];
        return (
            <div>
                <h4 className="text-xs font-bold text-slate-700 mb-2 text-center leading-tight">{title}</h4>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse border-2 border-slate-800">
                        <thead>
                            <tr className="bg-slate-100">
                                <th className="border border-slate-400 p-2 text-center font-bold text-[11px]"></th>
                                {datasets.map((ds, di) => (
                                    <th key={di} className="border border-slate-400 p-2 text-center font-bold text-[11px]">
                                        {ds.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {labels.map((label, li) => (
                                <tr key={li} className={li % 2 === 0 ? '' : 'bg-slate-50'}>
                                    <td className="border border-slate-400 p-2 font-bold bg-slate-50 text-[11px] text-center whitespace-nowrap">
                                        <span className="text-slate-800 mr-1">{circleNums[li] || `${li + 1}`}</span>
                                        {label}
                                    </td>
                                    {datasets.map((ds, di) => (
                                        <td key={di} className="border border-slate-400 p-2 text-center text-[11px]">
                                            {ds.data[li]}{typeof ds.data[li] === 'number' ? unit : ''}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {source && <div className="text-[10px] text-slate-400 mt-1 text-right italic">* {source}</div>}
            </div>
        );
    }

    // ══════════════════════════════════════
    // PIE CHART
    // ══════════════════════════════════════
    if (chartType === 'pie') {
        const data = datasets[0]?.data.map(v => Number(v)) || [];
        const total = data.reduce((s, v) => s + v, 0);
        const cx = 120, cy = 110, r = 85;

        let startAngle = -Math.PI / 2;
        const slices = data.map((val, i) => {
            const angle = (val / total) * 2 * Math.PI;
            const endAngle = startAngle + angle;
            const largeArc = angle > Math.PI ? 1 : 0;

            const x1 = cx + r * Math.cos(startAngle);
            const y1 = cy + r * Math.sin(startAngle);
            const x2 = cx + r * Math.cos(endAngle);
            const y2 = cy + r * Math.sin(endAngle);

            // Label position
            const midAngle = startAngle + angle / 2;
            const labelR = r * 0.65;
            const lx = cx + labelR * Math.cos(midAngle);
            const ly = cy + labelR * Math.sin(midAngle);

            const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
            startAngle = endAngle;

            return { path, lx, ly, val, label: labels[i] || '', color: PIE_COLORS[i % PIE_COLORS.length], pct: ((val / total) * 100).toFixed(1) };
        });

        return (
            <div>
                <h4 className="text-xs font-bold text-slate-700 mb-1 text-center leading-tight">{title}</h4>
                <div className="flex justify-center">
                    <svg viewBox="0 0 340 230" className="w-full max-w-[360px]" style={{ fontFamily: 'serif' }}>
                        {slices.map((s, i) => (
                            <g key={i}>
                                <path d={s.path} fill={s.color} stroke="#fff" strokeWidth="1.5" />
                                <text x={s.lx} y={s.ly} textAnchor="middle" dominantBaseline="central" fontSize="9" fill="#333" fontWeight="bold">
                                    {s.pct}%
                                </text>
                            </g>
                        ))}
                        {/* Legend */}
                        <g transform="translate(250, 30)">
                            {slices.map((s, i) => (
                                <g key={i} transform={`translate(0, ${i * 18})`}>
                                    <rect x={0} y={0} width={12} height={12} fill={s.color} stroke="#666" strokeWidth="0.5" />
                                    <text x={16} y={10} fontSize="9" fill="#333">{s.label}</text>
                                </g>
                            ))}
                        </g>
                    </svg>
                </div>
                {source && <div className="text-[10px] text-slate-400 text-right italic mt-0.5">* {source}</div>}
            </div>
        );
    }

    // ══════════════════════════════════════
    // LINE CHART
    // ══════════════════════════════════════
    if (chartType === 'line') {
        const numericData = datasets.map(ds => ({
            ...ds,
            numData: ds.data.map(v => Number(v))
        }));

        const allValues = numericData.flatMap(ds => ds.numData);
        const maxVal = Math.max(...allValues);
        const minActual = Math.min(...allValues);

        const W = 400, H = 250;
        const padLeft = 55, padRight = 30, padTop = 20, padBottom = 50;
        const chartW = W - padLeft - padRight;
        const chartH = H - padTop - padBottom;

        const niceMax = Math.ceil(maxVal / 10) * 10 + 10;
        const niceMin = Math.max(0, Math.floor(minActual / 10) * 10 - 10);
        const range = niceMax - niceMin;
        const yTicks = 5;
        const yStep = range / yTicks;

        const yScale = (val: number) => padTop + chartH - ((val - niceMin) / range) * chartH;
        const xScale = (idx: number) => padLeft + (idx / (labels.length - 1)) * chartW;

        return (
            <div>
                <h4 className="text-xs font-bold text-slate-700 mb-1 text-center leading-tight">{title}</h4>
                <div className="flex justify-center">
                    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[420px]" style={{ fontFamily: 'serif' }}>
                        {/* Y-axis label */}
                        <text x={padLeft - 5} y={padTop - 6} textAnchor="end" fontSize="9" fill="#666">{unit.trim()}</text>

                        {/* Grid + Y labels */}
                        {Array.from({ length: yTicks + 1 }, (_, i) => {
                            const val = niceMin + i * yStep;
                            const y = yScale(val);
                            return (
                                <g key={i}>
                                    <line x1={padLeft} y1={y} x2={W - padRight} y2={y} stroke="#e0e0e0" strokeWidth="0.5" />
                                    <text x={padLeft - 8} y={y + 3} textAnchor="end" fontSize="9" fill="#666">
                                        {val.toFixed(val % 1 === 0 ? 0 : 1)}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Lines + Points */}
                        {numericData.map((ds, di) => {
                            const points = ds.numData.map((val, gi) => `${xScale(gi)},${yScale(val)}`).join(' ');
                            return (
                                <g key={di}>
                                    <polyline points={points} fill="none" stroke={LINE_COLORS[di % LINE_COLORS.length]}
                                        strokeWidth="2" strokeLinejoin="round" />
                                    {ds.numData.map((val, gi) => (
                                        <g key={gi}>
                                            <circle cx={xScale(gi)} cy={yScale(val)} r="4"
                                                fill="white" stroke={LINE_COLORS[di % LINE_COLORS.length]} strokeWidth="2" />
                                            <text x={xScale(gi)} y={yScale(val) - 8} textAnchor="middle" fontSize="8" fill="#333" fontWeight="bold">
                                                {val}
                                            </text>
                                        </g>
                                    ))}
                                </g>
                            );
                        })}

                        {/* X labels */}
                        {labels.map((label, i) => (
                            <text key={i} x={xScale(i)} y={H - padBottom + 16} textAnchor="middle" fontSize="9" fill="#333">
                                {label}
                            </text>
                        ))}

                        {/* Axes */}
                        <line x1={padLeft} y1={padTop} x2={padLeft} y2={H - padBottom} stroke="#333" strokeWidth="1" />
                        <line x1={padLeft} y1={H - padBottom} x2={W - padRight} y2={H - padBottom} stroke="#333" strokeWidth="1" />

                        {/* Legend */}
                        {numericData.length > 1 && (
                            <g transform={`translate(${padLeft + 10}, ${padTop + 5})`}>
                                {numericData.map((ds, di) => (
                                    <g key={di} transform={`translate(${di * 90}, 0)`}>
                                        <line x1={0} y1={5} x2={16} y2={5} stroke={LINE_COLORS[di % LINE_COLORS.length]} strokeWidth="2" />
                                        <text x={20} y={8} fontSize="9" fill="#333">{MARKERS[di % MARKERS.length]} {ds.label}</text>
                                    </g>
                                ))}
                            </g>
                        )}
                    </svg>
                </div>
                {source && <div className="text-[10px] text-slate-400 text-right italic mt-0.5">* {source}</div>}
            </div>
        );
    }

    // ══════════════════════════════════════
    // STACKED BAR CHART
    // ══════════════════════════════════════
    if (chartType === 'stacked_bar') {
        const numericData = datasets.map(ds => ({
            ...ds,
            numData: ds.data.map(v => Number(v))
        }));

        // Calculate stacked totals for max
        const stackedTotals = labels.map((_, gi) =>
            numericData.reduce((sum, ds) => sum + ds.numData[gi], 0)
        );
        const maxVal = Math.max(...stackedTotals);

        const maxLabelLen = Math.max(...labels.map(l => l.length));
        const needsRotation = maxLabelLen > 8 || labels.length > 5;

        const W = 420;
        const padLeft = 55;
        const padRight = 20;
        const padTop = 15;
        const padBottom = needsRotation ? 80 : 45;
        const H = 250 + (needsRotation ? 35 : 0);
        const chartW = W - padLeft - padRight;
        const chartH = H - padTop - padBottom;

        const niceMax = Math.ceil(maxVal / 10) * 10 + 10;
        const yTicks = 5;
        const yStep = niceMax / yTicks;
        const yScale = (val: number) => padTop + chartH - (val / niceMax) * chartH;
        const groupWidth = chartW / labels.length;
        const barW = Math.min(groupWidth * 0.6, 35);

        return (
            <div>
                <h4 className="text-xs font-bold text-slate-700 mb-1 text-center leading-tight">{title}</h4>
                <div className="flex justify-center">
                    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[440px]" style={{ fontFamily: 'serif' }}>
                        {/* Y-axis unit */}
                        <text x={padLeft - 5} y={padTop - 4} textAnchor="end" fontSize="9" fill="#666">{unit.trim()}</text>

                        {/* Grid + Y labels */}
                        {Array.from({ length: yTicks + 1 }, (_, i) => {
                            const val = i * yStep;
                            const y = yScale(val);
                            return (
                                <g key={i}>
                                    <line x1={padLeft} y1={y} x2={W - padRight} y2={y} stroke="#e0e0e0" strokeWidth="0.5" />
                                    <text x={padLeft - 8} y={y + 3} textAnchor="end" fontSize="9" fill="#666">
                                        {val.toFixed(val % 1 === 0 ? 0 : 1)}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Stacked bars */}
                        {labels.map((label, gi) => {
                            const groupX = padLeft + gi * groupWidth + groupWidth / 2;
                            let cumHeight = 0;
                            return (
                                <g key={gi}>
                                    {/* X label */}
                                    {needsRotation ? (
                                        <text x={groupX} y={H - padBottom + 12} textAnchor="end" fontSize="8" fill="#333"
                                            transform={`rotate(-40, ${groupX}, ${H - padBottom + 12})`}>{label}</text>
                                    ) : (
                                        <text x={groupX} y={H - padBottom + 16} textAnchor="middle" fontSize="9" fill="#333">{label}</text>
                                    )}
                                    {/* Stacked segments */}
                                    {numericData.map((ds, di) => {
                                        const val = ds.numData[gi];
                                        const bx = groupX - barW / 2;
                                        const bh = (val / niceMax) * chartH;
                                        const by = yScale(0) - cumHeight - bh;
                                        cumHeight += bh;
                                        return (
                                            <g key={di}>
                                                <rect x={bx} y={by} width={barW} height={Math.max(bh, 0)}
                                                    fill={COLORS[di % COLORS.length]} stroke="#fff" strokeWidth="0.5" />
                                                {bh > 14 && (
                                                    <text x={bx + barW / 2} y={by + bh / 2 + 3} textAnchor="middle" fontSize="7" fill="#fff" fontWeight="bold">
                                                        {val}
                                                    </text>
                                                )}
                                            </g>
                                        );
                                    })}
                                </g>
                            );
                        })}

                        {/* Axes */}
                        <line x1={padLeft} y1={padTop} x2={padLeft} y2={H - padBottom} stroke="#333" strokeWidth="1" />
                        <line x1={padLeft} y1={H - padBottom} x2={W - padRight} y2={H - padBottom} stroke="#333" strokeWidth="1" />

                        {/* Legend */}
                        <g transform={`translate(${W - padRight - numericData.length * 75}, ${padTop})`}>
                            {numericData.map((ds, di) => (
                                <g key={di} transform={`translate(${di * 75}, 0)`}>
                                    <rect x={0} y={0} width={12} height={10} fill={COLORS[di % COLORS.length]} />
                                    <text x={16} y={9} fontSize="9" fill="#333">{ds.label}</text>
                                </g>
                            ))}
                        </g>
                    </svg>
                </div>
                {source && <div className="text-[10px] text-slate-400 text-right italic mt-0.5">* {source}</div>}
            </div>
        );
    }

    // ══════════════════════════════════════
    // BAR CHART (default) — with rotated labels for long text
    // ══════════════════════════════════════
    const numericData = datasets.map(ds => ({
        ...ds,
        numData: ds.data.map(v => Number(v))
    }));

    const allValues = numericData.flatMap(ds => ds.numData);
    const maxVal = Math.max(...allValues);

    // Check if labels are long → need rotation
    const maxLabelLen = Math.max(...labels.map(l => l.length));
    const needsRotation = maxLabelLen > 8 || labels.length > 5;

    const W = 480;
    const padLeft = 60;
    const padRight = 25;
    const padTop = 20;
    const padBottom = needsRotation ? 90 : 50;
    const H = 280 + (needsRotation ? 40 : 0);
    const chartW = W - padLeft - padRight;
    const chartH = H - padTop - padBottom;

    const niceMax = Math.ceil(maxVal / 10) * 10 + 10;
    const yTicks = 5;
    const yStep = niceMax / yTicks;

    const yScale = (val: number) => padTop + chartH - (val / niceMax) * chartH;
    const groupWidth = chartW / labels.length;
    const barCount = numericData.length;
    const barW = Math.min(groupWidth * 0.7 / barCount, 35);
    const barGap = 3;

    return (
        <div>
            <h4 className="text-sm font-bold text-slate-800 mb-2 text-center leading-tight">{title}</h4>
            <div className="flex justify-center">
                <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[500px]" style={{ fontFamily: 'serif' }}>
                    {/* Y-axis unit */}
                    <text x={padLeft - 5} y={padTop - 6} textAnchor="end" fontSize="11" fill="#555" fontWeight="bold">{unit.trim()}</text>

                    {/* Grid + Y labels */}
                    {Array.from({ length: yTicks + 1 }, (_, i) => {
                        const val = i * yStep;
                        const y = yScale(val);
                        return (
                            <g key={i}>
                                <line x1={padLeft} y1={y} x2={W - padRight} y2={y} stroke="#ddd" strokeWidth="0.8" strokeDasharray={i === 0 ? '' : '3,3'} />
                                <text x={padLeft - 10} y={y + 4} textAnchor="end" fontSize="11" fill="#555">
                                    {val.toFixed(val % 1 === 0 ? 0 : 1)}
                                </text>
                            </g>
                        );
                    })}

                    {/* Bars */}
                    {labels.map((label, gi) => {
                        const groupX = padLeft + gi * groupWidth + groupWidth / 2;
                        return (
                            <g key={gi}>
                                {/* X-axis label */}
                                {needsRotation ? (
                                    <text
                                        x={groupX}
                                        y={H - padBottom + 14}
                                        textAnchor="end"
                                        fontSize="10"
                                        fill="#333"
                                        fontWeight="bold"
                                        transform={`rotate(-40, ${groupX}, ${H - padBottom + 14})`}
                                    >
                                        {label}
                                    </text>
                                ) : (
                                    <text x={groupX} y={H - padBottom + 18} textAnchor="middle" fontSize="11" fill="#333" fontWeight="bold">
                                        {label}
                                    </text>
                                )}
                                {/* Bars */}
                                {numericData.map((ds, di) => {
                                    const totalBarsW = barCount * barW + (barCount - 1) * barGap;
                                    const bx = groupX - totalBarsW / 2 + di * (barW + barGap);
                                    const val = ds.numData[gi];
                                    const by = yScale(val);
                                    const bh = yScale(0) - by;
                                    return (
                                        <g key={di}>
                                            <rect x={bx} y={by} width={barW} height={Math.max(bh, 0)}
                                                fill={COLORS[di % COLORS.length]} rx="1" />
                                            <text x={bx + barW / 2} y={by - 5} textAnchor="middle" fontSize="10" fill="#333" fontWeight="bold">
                                                {val}
                                            </text>
                                        </g>
                                    );
                                })}
                            </g>
                        );
                    })}

                    {/* Axes */}
                    <line x1={padLeft} y1={padTop} x2={padLeft} y2={H - padBottom} stroke="#333" strokeWidth="1.5" />
                    <line x1={padLeft} y1={H - padBottom} x2={W - padRight} y2={H - padBottom} stroke="#333" strokeWidth="1.5" />

                    {/* Legend */}
                    {numericData.length > 1 && (
                        <g transform={`translate(${W - padRight - numericData.length * 75}, ${padTop})`}>
                            {numericData.map((ds, di) => (
                                <g key={di} transform={`translate(${di * 75}, 0)`}>
                                    <rect x={0} y={0} width={12} height={10} fill={COLORS[di % COLORS.length]} />
                                    <text x={16} y={9} fontSize="9" fill="#333">{ds.label}</text>
                                </g>
                            ))}
                        </g>
                    )}
                </svg>
            </div>
            {source && (
                <div className="text-[10px] text-slate-400 text-right italic mt-0.5">
                    <span className="italic">Note:</span> All numbers are rounded to one decimal place.
                </div>
            )}
        </div>
    );
}
