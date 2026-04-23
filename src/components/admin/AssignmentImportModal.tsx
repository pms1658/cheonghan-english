import React, { useState, useEffect } from 'react';
import { dbService } from '@/services/db';
import { Assignment, Class } from '@/types';
import { toast } from 'sonner';

interface AssignmentImportModalProps {
    onClose: () => void;
    onSelect: (assignment: Assignment) => void;
    classes: Class[];
}

export default function AssignmentImportModal({ onClose, onSelect, classes }: AssignmentImportModalProps) {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');

    useEffect(() => {
        loadAssignments();
    }, []);

    const loadAssignments = async () => {
        try {
            const data = await dbService.getAssignments();
            // Sort by newest first
            const sorted = data.sort((a, b) => (Number(b.createdAt || 0) - Number(a.createdAt || 0)));
            setAssignments(sorted);
        } catch (e) {
            console.error(e);
            toast.error("과제 목록을 불러오는데 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const filteredAssignments = assignments.filter(a => {
        // Search Term
        const matchesSearch =
            a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (a.content || '').toLowerCase().includes(searchTerm.toLowerCase());

        // Class Filter
        let matchesClass = true;
        if (selectedClassFilter !== 'all') {
            matchesClass = (a.classIds || []).includes(selectedClassFilter);
        }

        return matchesSearch && matchesClass;
    });

    const getClassName = (classId: string) => {
        const cls = classes.find(c => c.id === classId);
        return cls ? cls.name : 'Unknown Class';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[24px] w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">기존 과제 불러오기</h3>
                        <p className="text-sm text-slate-500">이전에 만든 과제의 내용을 복사해서 새 과제를 만듭니다.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                {/* Filters */}
                <div className="p-6 pb-0 pt-4 flex gap-4">
                    <div className="flex-1 relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        <input
                            type="text"
                            placeholder="과제 제목 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <select
                        value={selectedClassFilter}
                        onChange={(e) => setSelectedClassFilter(e.target.value)}
                        className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold text-slate-600"
                    >
                        <option value="all">모든 클래스</option>
                        {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    {loading ? (
                        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
                    ) : filteredAssignments.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">검색 결과가 없습니다.</div>
                    ) : (
                        filteredAssignments.map(ass => (
                            <div
                                key={ass.id}
                                onClick={() => onSelect(ass)}
                                className="group p-4 rounded-xl border border-slate-100 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-all flex justify-between items-center"
                            >
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border
                                            ${ass.type === 'structure' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                ass.type === 'selection' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                    'bg-emerald-50 text-emerald-600 border-emerald-100'
                                            }
                                        `}>
                                            {ass.type === 'structure' ? '구조독해' : ass.type === 'selection' ? '단어선택' : '단어학습'}
                                        </span>
                                        <h4 className="font-bold text-slate-800 group-hover:text-blue-700">{ass.title}</h4>
                                    </div>
                                    <div className="text-xs text-slate-500 flex items-center gap-2">
                                        <span>{(ass.classIds || []).map(id => getClassName(id)).join(', ')}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                        <span>{new Date(ass.createdAt || 0).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <button className="px-3 py-1.5 bg-white border border-slate-200 text-slate-500 text-xs font-bold rounded-lg group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-colors">
                                    선택
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
