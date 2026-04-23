'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { dbService } from '@/services/db';

interface SearchResult {
    id: string;
    title: string;
    type: 'page' | 'class' | 'student';
    path: string;
    icon?: string;
}

export default function CommandPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const router = useRouter();
    const { user } = useAuth();

    // Data Sources
    const [classes, setClasses] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);

    useEffect(() => {
        // Toggle with Cmd+K / Ctrl+K
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            if (e.key === 'Escape') setIsOpen(false);
        };

        window.addEventListener('keydown', handleKeyDown);

        // Pre-fetch searchable data
        const fetchData = async () => {
            const [cls, stu] = await Promise.all([
                dbService.getClasses(),
                dbService.getStudents()
            ]);
            setClasses(cls);
            setStudents(stu);
        };
        fetchData();

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (!isOpen) {
            setQuery('');
            setSelectedIndex(0);
            return;
        }

        // Focus input
        setTimeout(() => {
            document.getElementById('cmd-input')?.focus();
        }, 50);

    }, [isOpen]);

    // Filtering Logic
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        const lowerQuery = query.toLowerCase();

        // 1. Pages Match
        const pages: SearchResult[] = [
            { id: 'dash', title: 'Dashboard', type: 'page', path: '/dashboard', icon: '🏠' },
            { id: 'hist', title: 'History (학습 내역)', type: 'page', path: '/history', icon: '📚' },
            { id: 'guide', title: 'Guide (이용 가이드)', type: 'page', path: '/guide', icon: '📖' },
        ];
        if ((user as any)?.role === 'admin') {
            pages.push({ id: 'mgmt', title: 'Management (학생 관리)', type: 'page', path: '/management', icon: '⚙️' });
        }

        const matchedPages = pages.filter(p => p.title.toLowerCase().includes(lowerQuery));

        // 2. Classes Match
        const matchedClasses = classes
            .filter(c => c.name.toLowerCase().includes(lowerQuery))
            .map(c => ({
                id: c.id,
                title: c.name,
                type: 'class' as const,
                path: `/class/${c.id}`,
                icon: '🏫'
            }));

        // 3. Students Match (Admin Only)
        let matchedStudents: SearchResult[] = [];
        if ((user as any)?.role === 'admin') {
            matchedStudents = students
                .filter(s => s.name.toLowerCase().includes(lowerQuery) || s.username?.toLowerCase().includes(lowerQuery))
                .map(s => ({
                    id: s.id,
                    title: `${s.name} (${s.username})`,
                    type: 'student' as const,
                    path: `/history?search=${s.name}`, // Navigate to history specific to student
                    icon: '🎓'
                }));
        }

        setResults([...matchedPages, ...matchedClasses, ...matchedStudents].slice(0, 10)); // Limit to 10
        setSelectedIndex(0);

    }, [query, classes, students, user]);


    // Navigation
    const handleSelect = (result: SearchResult) => {
        router.push(result.path);
        setIsOpen(false);
    };

    const handleKeyDownInInput = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % results.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (results[selectedIndex]) {
                handleSelect(results[selectedIndex]);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] px-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsOpen(false)} />

            <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-scaleUp border border-transparent dark:border-white/10">
                <div className="flex items-center px-4 py-4 border-b border-slate-100 dark:border-white/10">
                    <svg className="w-6 h-6 text-slate-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    <input
                        id="cmd-input"
                        type="text"
                        placeholder="Type a command or search..."
                        className="w-full text-lg outline-none text-slate-700 dark:text-slate-200 font-medium placeholder:text-slate-300 dark:placeholder:text-slate-500 bg-transparent"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDownInInput}
                        autoComplete="off"
                    />
                    <div className="hidden sm:flex items-center gap-1 text-xs font-bold text-slate-300 border border-slate-200 dark:border-white/10 rounded px-2 py-1">
                        <span>ESC</span>
                    </div>
                </div>

                <div className="max-h-[60vh] overflow-y-auto">
                    {results.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                            {query ? 'No results found.' : 'Search for pages, classes, or students...'}
                        </div>
                    ) : (
                        <ul className="py-2">
                            {results.map((result, idx) => (
                                <li
                                    key={`${result.type}-${result.id}`}
                                    onClick={() => handleSelect(result)}
                                    className={`px-4 py-3 mx-2 rounded-xl flex items-center gap-3 cursor-pointer transition-colors ${idx === selectedIndex ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                        }`}
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${idx === selectedIndex ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-slate-100 dark:bg-slate-800'
                                        }`}>
                                        {result.icon}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold">{result.title}</div>
                                        <div className="text-[10px] uppercase tracking-wider opacity-60 font-bold">{result.type}</div>
                                    </div>
                                    {idx === selectedIndex && (
                                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 border-t border-slate-100 dark:border-white/10 flex justify-between items-center text-xs text-slate-400 font-medium">
                    <div className="flex gap-4">
                        <span className="flex items-center gap-1"><kbd className="font-sans bg-white dark:bg-slate-700 border border-slate-200 dark:border-white/10 rounded px-1">↑↓</kbd> to navigate</span>
                        <span className="flex items-center gap-1"><kbd className="font-sans bg-white dark:bg-slate-700 border border-slate-200 dark:border-white/10 rounded px-1">↵</kbd> to select</span>
                    </div>
                    <span>Cheonghan Command</span>
                </div>
            </div>
        </div>
    );
}
