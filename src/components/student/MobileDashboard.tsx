import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { StudentDashboardData } from '@/hooks/useStudentDashboard';
import { useAuth } from '@/context/AuthContext';
import { dbService } from '@/services/db';
import { Homework } from '@/types';

export default function MobileDashboard({
    assignments,
    notices,
    filter,
    setFilter,
    studentName,
    showPasswordModal,
    setShowPasswordModal,
    passwordForm,
    setPasswordForm,
    handlePasswordChange,
    filteredAssignments,
    logout,
    installPrompt,
    handleInstallClick,
    myClasses
}: StudentDashboardData) {
    const router = useRouter();

    // Workbook State
    const [viewMode, setViewMode] = useState<'dashboard' | 'workbook'>('dashboard');
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // Filter assignments based on selected class
    const classAssignments = selectedClassId
        ? assignments.filter(a => (a.classIds || []).includes(selectedClassId))
        : assignments; // Changed logic: if no class selected (Hub mode), show all or force selection? 
    // Wait, for workbook view, we want to select class.
    // For dashboard view, we aren't showing stats anyway.

    const filteredClassAssignments = classAssignments.filter(a => {
        if (filter === 'all') return true;
        if (filter === 'completed') return a.status === 'completed';
        if (filter === 'in_progress') return a.status !== 'completed';
        return false;
    });

    // Prevent body scroll when drawer is open
    useEffect(() => {
        if (isDrawerOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isDrawerOpen]);

    // --- TIME-SENSITIVE GREETING (KST Logic) ---
    const [greeting, setGreeting] = useState("Good Morning");
    useEffect(() => {
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const kstDate = new Date(utc + (3600000 * 9));
        const hour = kstDate.getHours();

        if (hour >= 5 && hour < 12) setGreeting("Good Morning");
        else if (hour >= 12 && hour < 18) setGreeting("Good Afternoon");
        else setGreeting("Good Evening");
    }, []);

    // --- SHARED: DAILY QUOTE (날짜 기반 로테이션) ---
    const QUOTES = [
        { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
        { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
        { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
        { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
        { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
        { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
        { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
        { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
        { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
        { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
        { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
        { text: "What we learn with pleasure we never forget.", author: "Alfred Mercier" },
        { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
        { text: "A journey of a thousand miles begins with a single step.", author: "Lao Tzu" },
        { text: "Your limitation—it's only your imagination.", author: "Unknown" },
        { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
        { text: "Great things never come from comfort zones.", author: "Unknown" },
        { text: "Dream it. Wish it. Do it.", author: "Unknown" },
        { text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
        { text: "The pain you feel today will be the strength you feel tomorrow.", author: "Unknown" },
        { text: "Don't limit your challenges. Challenge your limits.", author: "Unknown" },
        { text: "Every accomplishment starts with the decision to try.", author: "John F. Kennedy" },
        { text: "Knowledge is power.", author: "Francis Bacon" },
        { text: "Fall seven times, stand up eight.", author: "Japanese Proverb" },
        { text: "The more that you read, the more things you will know.", author: "Dr. Seuss" },
        { text: "Strive for progress, not perfection.", author: "Unknown" },
        { text: "Learning never exhausts the mind.", author: "Leonardo da Vinci" },
        { text: "Today a reader, tomorrow a leader.", author: "Margaret Fuller" },
        { text: "Small daily improvements are the key to staggering long-term results.", author: "Unknown" },
        { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
    ];
    const QuoteSection = () => {
        const today = new Date();
        const dayIndex = Math.floor((today.getFullYear() * 366 + (today.getMonth() + 1) * 31 + today.getDate())) % QUOTES.length;
        const quote = QUOTES[dayIndex];

        return (
            <div className="relative w-full overflow-hidden rounded-[2rem] bg-slate-900 aspect-[2/1] flex flex-col items-center justify-center text-center p-4 shadow-xl group mb-6">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-900/40 via-slate-900 to-slate-900" />
                <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-blue-600/10 rounded-full blur-[50px] -mr-10 -mt-10 mix-blend-screen animate-pulse-slow" />

                <div className="relative z-10 space-y-3">
                    <span className="inline-block px-2 py-0.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 text-[10px] font-bold tracking-widest uppercase mb-1 backdrop-blur-sm">
                        Daily Inspiration
                    </span>
                    {/* Calmer Font: font-serif, no italic */}
                    <h2 className="text-xl font-serif text-white leading-tight opacity-90 line-clamp-3">
                        &quot;{quote.text}&quot;
                    </h2>
                    <p className="text-slate-500 text-[10px] font-medium tracking-wide border-t border-slate-800 pt-2 px-4 inline-block">
                        — {quote.author}
                    </p>
                </div>
            </div>
        );
    }

    // --- MAIN RENDER ---
    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-24">
            {/* Header - Simplified */}
            <header className="px-6 pt-12 pb-6 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                        {greeting},<br />
                        <span className="text-slate-400">{studentName}.</span>
                    </h2>
                </div>
                <button
                    onClick={() => setIsDrawerOpen(true)}
                    className="p-2 bg-white rounded-full shadow-sm text-slate-400 hover:text-slate-900 transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
                </button>
            </header>

            <div className="px-6">
                <QuoteSection />

                {/* Homework Widget */}
                <MobileHomeworkWidget />

                {/* Navigation Hub - 3 Items (Guide, History, Feedback) */}
                <div className="space-y-4">
                    {/* Removed My Class Button as requested */}

                    <div className="grid grid-cols-1 gap-4">
                        <Link href="/guide" className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm active:scale-[0.98] transition-all flex items-center justify-between group relative overflow-hidden hover-lift">
                            <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-blue-600 transition-all duration-300 group-hover:w-full"></div>
                            <div className="relative z-10">
                                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest block mb-1">Wiki</span>
                                <h3 className="text-lg font-bold text-slate-900">GUIDE</h3>
                                <p className="text-[10px] text-slate-500 mt-1">구조독해 가이드</p>
                            </div>
                            <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors relative z-10">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                            </div>
                        </Link>

                        <Link href="/history" className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm active:scale-[0.98] transition-all flex items-center justify-between group relative overflow-hidden hover-lift">
                            <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-blue-600 transition-all duration-300 group-hover:w-full"></div>
                            <div className="relative z-10">
                                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest block mb-1">Archive</span>
                                <h3 className="text-lg font-bold text-slate-900">HISTORY</h3>
                                <p className="text-[10px] text-slate-500 mt-1">나의 학습 기록</p>
                            </div>
                            <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors relative z-10">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                            </div>
                        </Link>

                        <Link href="/feedback" className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm active:scale-[0.98] transition-all flex items-center justify-between group relative overflow-hidden hover-lift">
                            <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-blue-600 transition-all duration-300 group-hover:w-full"></div>
                            <div className="relative z-10">
                                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest block mb-1">Connect</span>
                                <h3 className="text-lg font-bold text-slate-900">FEEDBACK</h3>
                                <p className="text-[10px] text-slate-500 mt-1">건의사항 보내기</p>
                            </div>
                            <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors relative z-10">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                            </div>
                        </Link>
                    </div>

                    {/* Notices */}
                    <div className="bg-[#F8FAFC] rounded-[2rem] p-4 border border-slate-100/50 flex items-center justify-between">
                        <div>
                            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest block mb-1">Notice</span>
                            <p className="text-slate-600 text-xs font-medium">📢 No new notices.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Workbook View Overlay (If Active) */}
            {viewMode === 'workbook' && (
                <div className="fixed inset-0 z-50 bg-slate-50 overflow-y-auto animate-fade-in-up">
                    <div className="px-6 pt-12 pb-6">
                        <button
                            onClick={() => setViewMode('dashboard')}
                            className="mb-8 flex items-center gap-2 text-slate-400 font-bold text-sm hover:text-slate-900 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                            Back to Hub
                        </button>
                        <h2 className="text-2xl font-bold text-slate-900 mb-6">Select Class</h2>

                        <div className="space-y-4">
                            {/* All Classes Option */}
                            <div
                                onClick={() => { setSelectedClassId(null); /* Logic to show all assignments if needed, or stick to class based */ }}
                                className={`p-6 rounded-2xl border active:scale-95 transition-all
                                    ${selectedClassId === null ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200'}
                                `}
                            >
                                <h3 className="font-bold text-lg">All Classes</h3>
                                <p className={`text-xs mt-1 ${selectedClassId === null ? 'text-slate-400' : 'text-slate-500'}`}>View everything</p>
                            </div>

                            {myClasses.map((cls) => (
                                <div
                                    key={cls.id}
                                    onClick={() => setSelectedClassId(cls.id)}
                                    className={`p-6 rounded-2xl border active:scale-95 transition-all
                                        ${selectedClassId === cls.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200'}
                                    `}
                                >
                                    <h3 className="font-bold text-lg">{cls.name}</h3>
                                    <p className={`text-xs mt-1 ${selectedClassId === cls.id ? 'text-slate-400' : 'text-slate-500'}`}>Enter Class</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Assignment List for Selected Class */}
                    {/* Re-using the simplified list logic implicitly or explicitly */}
                    <div className="px-6 pb-20">
                        <h3 className="font-bold text-slate-900 mb-4 mt-8 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                            Assignments
                        </h3>
                        {/* Filtered List Code would go here... for now simplistic check */}
                        {filteredClassAssignments.length === 0 ? (
                            <div className="py-16 text-center rounded-2xl">
                                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                </div>
                                <p className="text-sm font-medium text-slate-400">아직 과제가 없습니다</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredClassAssignments.map(a => (
                                    <Link href={`/student/assignment/${a.id}`} key={a.id} className="block bg-white p-5 rounded-2xl border border-slate-200 shadow-sm active:scale-[0.98] transition-all hover-lift">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-md uppercase tracking-wide">{a.category}</span>
                                            {a.status === 'completed' && <span className="text-emerald-500 text-lg">✓</span>}
                                        </div>
                                        <h4 className="font-bold text-slate-900 mb-1">{a.title}</h4>
                                        <p className="text-xs text-slate-400">{new Date(a.deadline).toLocaleDateString()}</p>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Drawer */}
            {isDrawerOpen && (
                <div className="fixed inset-0 z-[200] flex justify-end">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-fade-in" onClick={() => setIsDrawerOpen(false)}></div>
                    <div className="relative w-[80%] max-w-[300px] h-full bg-white shadow-2xl animate-slide-in-right flex flex-col p-8">
                        <div className="flex justify-between items-center mb-10">
                            <h3 className="text-2xl font-bold text-slate-900">Menu.</h3>
                            <button onClick={() => setIsDrawerOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500">✕</button>
                        </div>
                        <div className="flex-1 space-y-4">
                            <div className="p-4 bg-slate-50 rounded-2xl">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Signed in as</div>
                                <div className="text-lg font-bold text-slate-900">{studentName}</div>
                            </div>
                            <button onClick={() => { setShowPasswordModal(true); setIsDrawerOpen(false); }} className="w-full py-4 text-left font-bold text-slate-600 hover:bg-slate-50 rounded-xl px-4 transition-colors">
                                Password
                            </button>
                            <button onClick={logout} className="w-full py-4 text-left font-bold text-red-500 hover:bg-red-50 rounded-xl px-4 transition-colors">
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── MOBILE HOMEWORK WIDGET ───
function MobileHomeworkWidget() {
    const { user } = useAuth();
    const [homeworks, setHomeworks] = useState<Homework[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (!user) return;
        const studentId = (user as any)?.id || (user as any)?.uid;
        if (!studentId) return;
        dbService.getStudentHomeworks(studentId).then(hws => {
            setHomeworks(hws.slice(0, 3));
            setLoaded(true);
        }).catch(() => setLoaded(true));
    }, [user]);

    const isNewHw = (createdAt: number) => Date.now() - createdAt < 24 * 60 * 60 * 1000;
    const isTodayHw = (dateStr: string) => {
        const today = new Date();
        const d = new Date(dateStr + 'T00:00:00');
        return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
    };

    if (!loaded) return null;

    return (
        <div className="mb-6">
            {homeworks.length === 0 ? (
                <div className="bg-white rounded-[2rem] p-6 border border-slate-100 text-center">
                    <p className="text-slate-400 text-sm font-medium">부여된 과제가 없습니다</p>
                </div>
            ) : (
                <div className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                과제
                            </h3>
                            {homeworks.some(h => isNewHw(h.createdAt)) && (
                                <span className="relative flex items-center">
                                    <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[9px] font-black rounded-md">NEW</span>
                                    <span className="absolute inset-0 bg-rose-500 rounded-md animate-ping opacity-30" />
                                </span>
                            )}
                        </div>
                        <Link href="/homework" className="text-[10px] font-bold text-blue-500">전체보기 →</Link>
                    </div>
                    {homeworks.map((hw, idx) => (
                        <div key={hw.id}>
                            {idx > 0 && <div className="border-t border-slate-100 my-3" />}
                            <div className="flex items-center gap-1.5 mb-1.5">
                                {isTodayHw(hw.date) && (
                                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 text-[9px] font-black rounded-md">TODAY</span>
                                )}
                                <p className="text-xs font-bold text-slate-500">{hw.title}</p>
                            </div>
                            <div className="space-y-1">
                                {hw.items.map((item, i) => (
                                    <p key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                                        <span className="text-blue-500 font-bold">{i + 1}.</span>
                                        <span>{item}</span>
                                    </p>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
