'use client';

import { useState, useRef, useEffect } from 'react';

interface ClassItem {
    id: string;
    name: string;
}

interface ClassSelectorProps {
    classes: ClassItem[];
    selectedClassIds: string[];
    onChange: (classIds: string[]) => void;
    label?: string;
}

/**
 * 공통 과제방 선택 컴포넌트 — 드롭다운 + 태그 방식
 * 모든 과제 생성 폼에서 사용
 */
export default function ClassSelector({ classes, selectedClassIds, onChange, label = '과제방' }: ClassSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const toggleClass = (classId: string) => {
        if (selectedClassIds.includes(classId)) {
            onChange(selectedClassIds.filter(id => id !== classId));
        } else {
            onChange([...selectedClassIds, classId]);
        }
    };

    const removeClass = (classId: string) => {
        onChange(selectedClassIds.filter(id => id !== classId));
    };

    const filteredClasses = classes.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase())
    );

    const selectedNames = classes.filter(c => selectedClassIds.includes(c.id));

    return (
        <div className="space-y-2" ref={dropdownRef}>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</label>

            {/* Selected Tags */}
            {selectedNames.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {selectedNames.map(c => (
                        <span
                            key={c.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#1e3a5f]/10 text-[#1e3a5f] rounded-lg text-xs font-bold border border-[#1e3a5f]/30"
                        >
                            {c.name}
                            <button
                                onClick={() => removeClass(c.id)}
                                className="text-[#1e3a5f]/60 hover:text-[#1e3a5f] ml-0.5"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {/* Dropdown Trigger */}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-sm font-medium text-left flex items-center justify-between transition-colors ${
                        isOpen ? 'border-[#1e3a5f] ring-2 ring-[#1e3a5f]/15' : 'border-slate-200 hover:border-slate-300'
                    }`}
                >
                    <span className={selectedNames.length > 0 ? 'text-slate-700' : 'text-slate-400'}>
                        {selectedNames.length > 0
                            ? `${selectedNames.length}개 선택됨`
                            : '과제방을 선택하세요'}
                    </span>
                    <svg className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </button>

                {/* Dropdown List */}
                {isOpen && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                        {/* Search */}
                        {classes.length > 5 && (
                            <div className="p-2 border-b border-slate-100">
                                <input
                                    type="text"
                                    placeholder="검색..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-[#1e3a5f]/40 outline-none"
                                    autoFocus
                                />
                            </div>
                        )}

                        {/* Options */}
                        <div className="max-h-48 overflow-y-auto">
                            {filteredClasses.length === 0 ? (
                                <div className="px-4 py-3 text-xs text-slate-400 text-center">과제방이 없습니다</div>
                            ) : (
                                filteredClasses.map(c => {
                                    const isSelected = selectedClassIds.includes(c.id);
                                    return (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => toggleClass(c.id)}
                                            className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2.5 transition-colors ${
                                                isSelected
                                                    ? 'bg-[#1e3a5f]/10 text-[#1e3a5f] font-bold'
                                                    : 'text-slate-600 hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                                isSelected ? 'bg-[#1e3a5f] border-[#1e3a5f]' : 'border-slate-300'
                                            }`}>
                                                {isSelected && (
                                                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                                                    </svg>
                                                )}
                                            </div>
                                            {c.name}
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {/* Select All / Clear */}
                        <div className="border-t border-slate-100 px-3 py-2 flex justify-between">
                            <button
                                type="button"
                                onClick={() => onChange(classes.map(c => c.id))}
                                className="text-[10px] font-bold text-[#1e3a5f] hover:underline"
                            >
                                전체 선택
                            </button>
                            <button
                                type="button"
                                onClick={() => onChange([])}
                                className="text-[10px] font-bold text-slate-400 hover:underline"
                            >
                                초기화
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
