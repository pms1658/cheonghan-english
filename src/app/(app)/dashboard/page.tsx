'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { getAdminDisplayName } from '@/lib/adminConfig';
import { motion } from 'framer-motion';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import HomeworkWidget from './HomeworkWidget';

// --- DATA: DAILY QUOTES ---
const QUOTES = [
    { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
    { text: "Success is not final, failure is not fatal.", author: "Winston Churchill" },
    { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
    { text: "Quality is not an act, it is a habit.", author: "Aristotle" },
    { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
    { text: "Education is the most powerful weapon you can use to change the world.", author: "Nelson Mandela" },
    { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
    { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
    { text: "A journey of a thousand miles begins with a single step.", author: "Lao Tzu" },
    { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
    { text: "What we learn with pleasure we never forget.", author: "Alfred Mercier" },
    { text: "The more that you read, the more things you will know.", author: "Dr. Seuss" },
    { text: "Strive for progress, not perfection.", author: "Unknown" },
    { text: "Dream big, start small, act now.", author: "Robin Sharma" },
    { text: "Your limitation—it's only your imagination.", author: "Unknown" },
    { text: "Great things never come from comfort zones.", author: "Unknown" },
    { text: "Don't wish it were easier. Wish you were better.", author: "Jim Rohn" },
    { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
    { text: "Learning never exhausts the mind.", author: "Leonardo da Vinci" },
    { text: "The roots of education are bitter, but the fruit is sweet.", author: "Aristotle" },
    { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
    { text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
];


// --- D-DAY WIDGET COMPONENT (Stable extraction) ---
const DDayWidget = () => {
    const { user } = useAuth();
    const [dday, setDday] = useState<{ title: string, date: string } | null>(null);
    const [isEditingDday, setIsEditingDday] = useState(false);
    const [editForm, setEditForm] = useState({ title: '', date: '' });

    useEffect(() => {
        const fetchDday = async () => {
            if (!user?.uid) {
                const saved = localStorage.getItem('cheonghan_dday');
                if (saved) { try { setDday(JSON.parse(saved)); } catch(e){} }
                return;
            }
            try {
                const docRef = doc(db, 'users', user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists() && docSnap.data().dday) {
                    setDday(docSnap.data().dday);
                    localStorage.setItem('cheonghan_dday', JSON.stringify(docSnap.data().dday)); // Cache local
                } else {
                    const saved = localStorage.getItem('cheonghan_dday');
                    if (saved) setDday(JSON.parse(saved));
                }
            } catch (e) {
                console.error("Failed to fetch D-Day", e);
                const saved = localStorage.getItem('cheonghan_dday');
                if (saved) setDday(JSON.parse(saved));
            }
        };
        fetchDday();
    }, [user?.uid]);

    const handleSaveDday = async () => {
        if (!editForm.title || !editForm.date) return;
        const d = { title: editForm.title, date: editForm.date };
        setDday(d);
        setIsEditingDday(false);
        localStorage.setItem('cheonghan_dday', JSON.stringify(d));
        
        if (user?.uid) {
            try {
                const docRef = doc(db, 'users', user.uid);
                await updateDoc(docRef, { dday: d });
            } catch (e) {
                console.error("Failed to update D-Day in Firestore", e);
            }
        }
    };

    const calculateDday = (targetDate: string) => {
        const target = new Date(targetDate);
        target.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diff = target.getTime() - today.getTime();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if (days === 0) return '-DAY';
        if (days > 0) return `-${days}`;
        return `+${Math.abs(days)}`;
    };

    return (
        <div className="relative w-full h-full bg-[#0d1334] flex flex-col justify-center items-center p-8 shadow-2xl overflow-hidden rounded-2xl border-t-[6px] border-blue-400 group transition-all">
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-white/3 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="relative z-10 w-full h-full flex flex-col items-center justify-center text-center">
                {isEditingDday ? (
                    <div className="w-full max-w-[200px] space-y-4 animate-fadeIn">
                        <div>
                            <label className="text-blue-200 text-[10px] uppercase font-bold tracking-wider block mb-1 text-left">목표 이름</label>
                            <input type="text" value={editForm.title} onChange={e => setEditForm(p => ({...p, title: e.target.value}))} placeholder="예: 2026 수능" className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-blue-200/50 outline-none focus:border-white focus:bg-white/20" />
                        </div>
                        <div>
                            <label className="text-blue-200 text-[10px] uppercase font-bold tracking-wider block mb-1 text-left">목표 날짜</label>
                            <input type="date" value={editForm.date} onChange={e => setEditForm(p => ({...p, date: e.target.value}))} className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white select-none" />
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button onClick={() => setIsEditingDday(false)} className="flex-1 py-2 rounded-lg text-xs font-bold text-white/70 hover:bg-white/10 transition-colors">취소</button>
                            <button onClick={handleSaveDday} className="flex-1 py-2 rounded-lg text-xs font-bold bg-blue-500 text-white hover:bg-blue-400 transition-colors">저장</button>
                        </div>
                    </div>
                ) : dday ? (
                    <div className="flex flex-col items-center animate-fadeIn relative w-full h-full justify-center">
                        <button onClick={() => { setEditForm({title: dday.title, date: dday.date}); setIsEditingDday(true); }} className="absolute top-0 right-0 p-2 text-white/50 hover:text-white transition-colors" title="D-Day 수정">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
                        <p className="text-blue-200 font-black tracking-widest uppercase text-base md:text-lg mb-2">{dday.title}</p>
                        <div className="text-6xl md:text-7xl font-black text-white tracking-tighter flex items-center justify-center tabular-nums">
                            <span className="text-blue-300">D</span>
                            {calculateDday(dday.date)}
                        </div>
                        <div className="mt-8 px-6 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                            <span className="text-white text-sm font-bold tracking-widest uppercase shadow-sm">
                                {dday.date}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center animate-fadeIn">
                        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-white mb-4">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        </div>
                        <h3 className="text-white font-bold text-lg mb-2">D-Day 설정</h3>
                        <p className="text-blue-200 text-sm mb-6 font-medium">중요한 시험이나 목표일을 설정하세요</p>
                        <button onClick={() => setIsEditingDday(true)} className="px-6 py-2.5 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-400 transition-colors shadow-lg">
                            + 추가하기
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default function NewDashboardPage() {
    const { user } = useAuth();
    const [quote, setQuote] = useState(QUOTES[0]);
    const [greeting, setGreeting] = useState("Good Morning");

    useEffect(() => {
        // --- 1. Daily Quote Rotation ---
        const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
        setQuote(QUOTES[dayOfYear % QUOTES.length]);

        // --- 2. KST Greeting ---
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const kstDate = new Date(utc + (3600000 * 9));
        const hour = kstDate.getHours();

        if (hour >= 5 && hour < 12) setGreeting("Good Morning");
        else if (hour >= 12 && hour < 18) setGreeting("Good Afternoon");
        else setGreeting("Good Evening");

    }, []);

    const isAdmin = (user as any)?.role === 'admin';

    // --- HERO: DAILY QUOTE CARD ---
    const quoteSection = (
        <div className="relative w-full h-full flex flex-col justify-center p-8 md:p-12 shadow-2xl overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-br from-[#0d1334] via-[#0a1128] to-[#080c20]">
            {/* Ambient glow */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] -mr-20 -mt-20 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-indigo-600/10 rounded-full blur-[80px] pointer-events-none"></div>
            {/* Left accent line */}
            <div className="absolute left-0 top-8 bottom-8 w-[3px] bg-gradient-to-b from-blue-400/0 via-blue-500 to-blue-400/0 rounded-full"></div>
            
            {/* Content */}
            <div className="relative z-10 flex flex-col w-full h-full justify-center items-center px-4 md:px-8">
                <div className="flex flex-col items-center w-full max-w-4xl">
                    <span className="text-blue-400/80 text-[10px] md:text-xs font-black uppercase mb-6 md:mb-8 text-center w-full tracking-[0.3em]">
                        DAILY INSPIRATION
                    </span>
                    
                    <h2 className="text-2xl md:text-3xl lg:text-4xl text-white/90 leading-[1.7] tracking-tight mb-8 font-black italic text-center w-full">
                        &ldquo;{quote.text}&rdquo;
                    </h2>
                    
                    <div className="flex items-center gap-3">
                        <div className="h-px w-8 bg-blue-500/60"></div>
                        <p className="text-blue-400/70 text-xs uppercase font-bold tracking-[0.2em]">
                            {quote.author}
                        </p>
                        <div className="h-px w-8 bg-blue-500/60"></div>
                    </div>
                </div>
            </div>
        </div>
    );

    // --- NAVIGATION GRID ---
    const navItems = [
        { href: '/guide',                                  label: 'GUIDE',    sub: '구조독해 학습 가이드', accent: 'from-blue-500/10 to-blue-300/5',    border: 'hover:border-blue-200 dark:hover:border-blue-500/40',   text: 'group-hover:text-blue-600 dark:group-hover:text-blue-400' },
        { href: '/history',                                label: 'HISTORY',  sub: '지난 학습 기록',      accent: 'from-indigo-500/10 to-indigo-300/5',  border: 'hover:border-indigo-200 dark:hover:border-indigo-500/40', text: 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400' },
        { href: '/board',                                  label: 'NOTICE',   sub: '공지사항 확인',       accent: 'from-rose-500/10 to-rose-300/5',      border: 'hover:border-rose-200 dark:hover:border-rose-500/40',     text: 'group-hover:text-rose-500 dark:group-hover:text-rose-400' },
        { href: isAdmin ? '/admin/feedback' : '/feedback', label: 'FEEDBACK', sub: '건의사항 보내기', accent: 'from-emerald-500/10 to-emerald-300/5', border: 'hover:border-emerald-200 dark:hover:border-emerald-500/40', text: 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400' },
    ];
    const navGrid = (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
            {navItems.map(item => (
                <Link
                    key={item.href}
                    href={item.href}
                    className={`relative bg-white dark:bg-[#0c102b] border border-slate-200 dark:border-white/10 rounded-2xl p-5 md:p-6 ${item.border} shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col justify-center overflow-hidden h-28 md:h-32`}
                >
                    {/* Hover gradient fill */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${item.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl`}></div>
                    <div className="relative z-10">
                        <h3 className={`text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tighter ${item.text} transition-colors duration-200`}>{item.label}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1.5 group-hover:text-slate-600 dark:group-hover:text-white/60 transition-colors">{item.sub}</p>
                    </div>
                </Link>
            ))}
        </div>
    );

    return (
        <div className="p-5 md:p-8 max-w-7xl mx-auto pb-24 lg:pb-12">
            {/* Header Text */}
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: "easeOut" }}
                className="mb-6 px-1"
            >
                <p className="text-slate-400 dark:text-slate-500 text-xs font-bold tracking-[0.25em] uppercase mb-1.5">{greeting}</p>
                <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
                    <span className="text-slate-900 dark:text-white">
                        {(user as any)?.role === 'admin'
                            ? getAdminDisplayName((user as any)?.email).replace('!', '')
                            : `${(user as any)?.name} 학생`
                        }
                    </span>
                </h1>
            </motion.div>

            <div className="space-y-4 md:space-y-6">
                {/* 1. Daily Quote & D-Day Section */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12, duration: 0.55, ease: "easeOut" }}
                    className="grid grid-cols-1 lg:grid-cols-3 gap-4"
                >
                    <div className="lg:col-span-2 min-h-[200px]">
                        {quoteSection}
                    </div>
                    <div className="lg:col-span-1 min-h-[200px]">
                        <DDayWidget />
                    </div>
                </motion.div>

                {/* 1.5 Homework Widget */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.22, duration: 0.55, ease: "easeOut" }}
                >
                    <HomeworkWidget user={user} isAdmin={isAdmin} />
                </motion.div>

                {/* 2. Navigation Hub */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.32, duration: 0.55, ease: "easeOut" }}
                >
                    {navGrid}
                </motion.div>
            </div>
        </div>
    );
}

