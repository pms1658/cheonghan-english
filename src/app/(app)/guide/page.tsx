'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function GuidePage() {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const scrollLeft = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
        }
    };

    const scrollRight = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
        }
    };

    return (
        <div className="selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden">

            {/* --- HERO SECTION --- */}
            <section className="relative h-[60vh] flex flex-col items-center justify-center text-center px-6">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="w-1 h-6 bg-slate-900"></div>
                        <span className="text-sm font-bold tracking-[0.2em] text-slate-500 dark:text-slate-400 uppercase">Learning Guide</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-6">
                        Language<br />Architecture.
                    </h1>
                    <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
                        단어만 나열하는 해석은 이제 그만.<br />
                        <span className="text-slate-900 dark:text-white font-bold">구조</span>를 보는 눈이 당신의 영어를 바꿉니다.
                    </p>
                </motion.div>

                {/* Scroll Indicator */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1, duration: 1 }}
                    className="absolute bottom-12 flex flex-col items-center gap-2"
                >
                    <span className="text-[10px] uppercase tracking-widest text-slate-400">Scroll to Explore</span>
                    <div className="w-px h-12 bg-gradient-to-b from-slate-900 to-transparent opacity-20"></div>
                </motion.div>
            </section>


            {/* --- SECTION 1: HIERARCHY (Vertical) --- */}
            <div className="max-w-4xl mx-auto px-6 py-16 md:py-20 space-y-10"> {/* Reduced vertical spacing and gap */}

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-20%" }}
                    className="text-center"
                >
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">품사 계급도 <span className="text-slate-300 font-light">Hierarchy</span></h2>
                    <p className="text-slate-500">문장의 뼈대를 잡아주는 8품사의 위계질서</p>
                </motion.div>

                {/* 1. Noun (King) */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: "-20%" }}
                    className="group relative bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-5 font-black text-9xl text-amber-500 select-none">1</div>
                    <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
                        <div className="flex-1 space-y-6">
                            <div className="border-l-4 border-amber-500 pl-6">
                                <span className="block text-amber-500 text-sm font-black tracking-[0.3em] uppercase mb-2">Hierarchy I</span>
                                <h3 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">THE KING</h3>
                                <p className="text-lg text-slate-500 mt-2 font-medium">1. 명사 & 2. 대명사</p>
                            </div>
                            <p className="text-slate-500 leading-relaxed pl-7 border-l border-slate-100">주어, 목적어, 보어 자리에 앉는 문장의 주인입니다.</p>

                            <div className="grid md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                <div>
                                    <h4 className="font-black text-slate-900 mb-2 text-lg">1. 명사 (Names)</h4>
                                    <ul className="text-sm text-slate-600 space-y-1.5">
                                        <li>• 셀 수 있는/없는 명사 구분</li>
                                        <li>• <span className="font-bold text-slate-900">명사 상당어구</span> (길어진 명사):<br /><span className="text-xs text-slate-400 pl-2 block mt-0.5">동명사, To부정사, 명사절(That/What)</span></li>
                                        <li className="text-amber-600 font-medium text-xs pt-1">⚠️ 관계대명사 What (불완전 문장)</li>
                                    </ul>
                                </div>
                                <div className="border-t md:border-t-0 md:border-l border-slate-200 pt-4 md:pt-0 md:pl-6">
                                    <h4 className="font-black text-slate-900 mb-2 text-lg">2. 대명사 (Pronouns)</h4>
                                    <ul className="text-sm text-slate-600 space-y-1.5">
                                        <li>• <span className="font-bold text-slate-900">수일치</span>: It/That vs Them/Those</li>
                                        <li>• <span className="font-bold text-slate-900">재귀대명사</span>: 주어=목적어 (-self)</li>
                                        <li>• <span className="font-bold text-slate-900">가주어/가목적어 It</span></li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* 2. Verb (Queen) */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: "-20%" }}
                    className="group relative bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-5 font-black text-9xl text-rose-500 select-none">2</div>
                    <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
                        <div className="flex-1 space-y-6">
                            <div className="border-l-4 border-rose-500 pl-6">
                                <span className="block text-rose-500 text-sm font-black tracking-[0.3em] uppercase mb-2">Hierarchy II</span>
                                <h3 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">THE QUEEN</h3>
                                <p className="text-lg text-slate-500 mt-2 font-medium">3. 동사 (Verb)</p>
                            </div>
                            <p className="text-slate-500 leading-relaxed pl-7 border-l border-slate-100">왕(주어)의 동작과 상태를 서술하며 문장을 지배합니다.</p>

                            <ul className="space-y-4">
                                <li className="flex gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="font-bold text-rose-500 text-lg">01</span>
                                    <div>
                                        <strong className="block text-slate-900 text-sm mb-0.5">1문장 1동사 원칙</strong>
                                        <span className="text-sm text-slate-500">접속사 없이는 한 문장에 동사가 하나뿐이어야 합니다.</span>
                                    </div>
                                </li>
                                <li className="flex gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="font-bold text-rose-500 text-lg">02</span>
                                    <div>
                                        <strong className="block text-slate-900 text-sm mb-0.5">수일치 (S-V Match)</strong>
                                        <span className="text-sm text-slate-500">단수주어(Each/Every/To-V) vs 복수주어(Both/A number of)</span>
                                    </div>
                                </li>
                                <li className="flex gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="font-bold text-rose-500 text-lg">03</span>
                                    <div>
                                        <strong className="block text-slate-900 text-sm mb-0.5">시제와 태</strong>
                                        <span className="text-sm text-slate-500">완료시제(have p.p) / 수동태(be p.p) 확인</span>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </div>
                </motion.div>

                {/* 3. Adjective (Noble) */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: "-20%" }}
                    className="group relative bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-5 font-black text-9xl text-violet-500 select-none">3</div>
                    <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
                        <div className="flex-1 space-y-6">
                            <div className="border-l-4 border-violet-500 pl-6">
                                <span className="block text-violet-500 text-sm font-black tracking-[0.3em] uppercase mb-2">Hierarchy III</span>
                                <h3 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">THE NOBLE</h3>
                                <p className="text-lg text-slate-500 mt-2 font-medium">4. 형용사 (Adjective)</p>
                            </div>
                            <p className="text-slate-500 leading-relaxed pl-7 border-l border-slate-100">명사를 수식하거나 보충 설명하여 문장을 풍성하게 만듭니다.</p>

                            <div className="grid gap-4">
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <h4 className="font-black text-slate-900 mb-1 text-lg">관계대명사절 (Who/Which/That)</h4>
                                    <p className="text-sm text-slate-500">선행사 수식, 뒤에 <span className="text-red-500 font-bold">불완전한 문장</span>이 옴.</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <h4 className="font-black text-slate-900 mb-1 text-lg">관계부사절 (When/Where/Why/How)</h4>
                                    <p className="text-sm text-slate-500">전치사+관대, 뒤에 <span className="text-blue-500 font-bold">완전한 문장</span>이 옴.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* 4. Others (Peasant) */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: "-20%" }}
                    className="group relative bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-5 font-black text-9xl text-teal-600 select-none">4</div>
                    <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
                        <div className="flex-1 space-y-6">
                            <div className="border-l-4 border-teal-600 pl-6">
                                <span className="block text-teal-600 text-sm font-black tracking-[0.3em] uppercase mb-2">Hierarchy IV</span>
                                <h3 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">THE PEASANTS</h3>
                                <p className="text-lg text-slate-500 mt-2 font-medium">5 ~ 8. 수식어 및 연결어</p>
                            </div>
                            <p className="text-slate-500 leading-relaxed pl-7 border-l border-slate-100">문장의 뼈대는 아니지만, 의미를 더하고 연결하는 역할을 합니다.</p>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <strong className="block text-slate-900 text-lg font-black mb-1">5. 부사 (Adverb)</strong>
                                    <span className="text-xs text-slate-500">동사/형용사/부사 수식. (이/히/리/게)</span>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <strong className="block text-slate-900 text-lg font-black mb-1">6. 접속사 (Conjunction)</strong>
                                    <span className="text-xs text-slate-500">문장과 문장을 연결. (And, But, If, That...)</span>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <strong className="block text-slate-900 text-lg font-black mb-1">7. 전치사 (Preposition)</strong>
                                    <span className="text-xs text-slate-500">명사 앞에 위치. 전치사+명사 = 수식어구</span>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <strong className="block text-slate-900 text-lg font-black mb-1">8. 감탄사 (Interjection)</strong>
                                    <span className="text-xs text-slate-500">독립적인 감탄 표현.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

            </div>






            {/* --- SECTION 2: 5 TYPES (Horizontal Scroll) --- */}
            <div className="py-24 bg-slate-900 text-white overflow-hidden relative group/carousel"> {/* Added relative for buttons */}
                <div className="max-w-7xl mx-auto px-6 mb-12 flex justify-between items-end">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-3xl md:text-5xl font-bold mb-4">문장의 5형식.</h2>
                        <p className="text-slate-400 text-lg">모든 영어 문장은 이 5가지 법칙 안에 있습니다.</p>
                    </motion.div>

                    {/* Navigation Buttons */}
                    <div className="hidden md:flex gap-4">
                        <button
                            onClick={scrollLeft}
                            className="w-12 h-12 rounded-full border border-white/20 bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors active:scale-95"
                        >
                            <ChevronLeft className="w-6 h-6 text-white" />
                        </button>
                        <button
                            onClick={scrollRight}
                            className="w-12 h-12 rounded-full border border-white/20 bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors active:scale-95"
                        >
                            <ChevronRight className="w-6 h-6 text-white" />
                        </button>
                    </div>
                </div>

                <div
                    ref={scrollContainerRef}
                    className="relative w-full overflow-x-auto snap-x snap-mandatory pb-12 flex gap-6 px-6 md:px-[max(2rem,calc((100vw-80rem)/2))] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                >


                    {/* Card 0: Intro (Rule) */}
                    <div className="snap-center shrink-0 w-[85vw] md:w-[400px] bg-slate-800 rounded-3xl p-8 border border-white/10 relative overflow-hidden group hover:bg-slate-700 transition-colors">
                        <div className="absolute top-4 right-4 text-8xl font-black text-white/5 group-hover:text-white/10 transition-colors">0</div>
                        <div className="relative z-10 pt-8">
                            <span className="inline-block px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold mb-4">Fundamental Rule</span>
                            <h3 className="text-4xl font-bold mb-2">S, V, O, C</h3>
                            <p className="text-slate-400 font-medium mb-8">4대 문장성분과 품사</p>

                            <div className="space-y-2 text-sm text-slate-300 border-t border-white/10 pt-4">
                                <p>• 주어(S): 명사, 대명사</p>
                                <p>• 서술어(V): 동사</p>
                                <p>• 목적어(O): 명사, 대명사</p>
                                <p>• 보어(C): 명사, 형용사</p>
                                <p className="text-[11px] text-slate-500 mt-4 border-t border-white/5 pt-3 italic leading-relaxed">
                                    ※ 위 성분을 제외한 나머지는 모두 수식어(M)입니다.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="snap-center shrink-0 w-[85vw] md:w-[400px] bg-slate-800 rounded-3xl p-8 border border-white/10 relative overflow-hidden group hover:bg-slate-700 transition-colors">
                        <div className="absolute top-4 right-4 text-8xl font-black text-white/5 group-hover:text-white/10 transition-colors">1</div>
                        <div className="relative z-10 pt-8">
                            <span className="inline-block px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold mb-4">자동사</span>
                            <h3 className="text-4xl font-bold mb-2">S + V</h3>
                            <p className="text-slate-400 font-medium mb-8">주어는 동사하다</p>
                            <div className="space-y-2 text-sm text-slate-300 border-t border-white/10 pt-4">
                                <p>• 완전자동사: go, come, arrive</p>
                                <p>• 유도부사: There + be + S</p>
                            </div>
                        </div>
                    </div>

                    {/* Card 2 */}
                    <div className="snap-center shrink-0 w-[85vw] md:w-[400px] bg-slate-800 rounded-3xl p-8 border border-white/10 relative overflow-hidden group hover:bg-slate-700 transition-colors">
                        <div className="absolute top-4 right-4 text-8xl font-black text-white/5 group-hover:text-white/10 transition-colors">2</div>
                        <div className="relative z-10 pt-8">
                            <span className="inline-block px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold mb-4">자동사</span>
                            <h3 className="text-4xl font-bold mb-2">S + V + C</h3>
                            <p className="text-slate-400 font-medium mb-8">주어는 보어이다</p>
                            <div className="space-y-2 text-sm text-slate-300 border-t border-white/10 pt-4">
                                <p>• Be동사 (S=C)</p>
                                <p>• 감각동사 (look, feel... + 형용사)</p>
                                <p>• 상태변화 (become, turn)</p>
                            </div>
                        </div>
                    </div>

                    {/* Card 3 */}
                    <div className="snap-center shrink-0 w-[85vw] md:w-[400px] bg-slate-800 rounded-3xl p-8 border border-white/10 relative overflow-hidden group hover:bg-slate-700 transition-colors">
                        <div className="absolute top-4 right-4 text-8xl font-black text-white/5 group-hover:text-white/10 transition-colors">3</div>
                        <div className="relative z-10 pt-8">
                            <span className="inline-block px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold mb-4">타동사</span>
                            <h3 className="text-4xl font-bold mb-2">S + V + O</h3>
                            <p className="text-slate-400 font-medium mb-8">주어는 목적어를 동사하다</p>
                            <div className="space-y-2 text-sm text-slate-300 border-t border-white/10 pt-4">
                                <p>• 가장 흔한 문장 구조</p>
                                <p>• 목적어: 명사, 대명사, 절, To-V, V-ing</p>
                            </div>
                        </div>
                    </div>

                    {/* Card 4 */}
                    <div className="snap-center shrink-0 w-[85vw] md:w-[400px] bg-slate-800 rounded-3xl p-8 border border-white/10 relative overflow-hidden group hover:bg-slate-700 transition-colors">
                        <div className="absolute top-4 right-4 text-8xl font-black text-white/5 group-hover:text-white/10 transition-colors">4</div>
                        <div className="relative z-10 pt-8">
                            <span className="inline-block px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold mb-4">수여동사</span>
                            <h3 className="text-4xl font-bold mb-2">S+V+IO+DO</h3>
                            <p className="text-slate-400 font-medium mb-8">~에게 ~를 주다</p>
                            <div className="space-y-2 text-sm text-slate-300 border-t border-white/10 pt-4">
                                <p>• 동사: give, send, tell, show</p>
                                <p>• 순서: 사람(IO) + 사물(DO)</p>
                            </div>
                        </div>
                    </div>

                    {/* Card 5 */}
                    <div className="snap-center shrink-0 w-[85vw] md:w-[400px] bg-slate-800 rounded-3xl p-8 border border-white/10 relative overflow-hidden group hover:bg-slate-700 transition-colors">
                        <div className="absolute top-4 right-4 text-8xl font-black text-white/5 group-hover:text-white/10 transition-colors">5</div>
                        <div className="relative z-10 pt-8">
                            <span className="inline-block px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold mb-4">불완전타동사</span>
                            <h3 className="text-4xl font-bold mb-2">S+V+O+OC</h3>
                            <p className="text-slate-400 font-medium mb-8">O가 OC하도록 V하다</p>
                            <div className="space-y-2 text-sm text-slate-300 border-t border-white/10 pt-4">
                                <p>• 지각동사(see/hear) → 원형/-ing</p>
                                <p>• 사역동사(make/have/let) → 원형</p>
                                <p>• 준사역동사: help(to-v/원형), get(to-v)</p>
                            </div>
                        </div>
                    </div>
                    <div className="w-6 shrink-0"></div>
                </div>
            </div>


            {/* --- SECTION 3: SYMBOLS (Grid) --- */}
            <div className="max-w-7xl mx-auto px-6 py-20 md:py-24">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">Visual Symbols.</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-lg">복잡한 문장도 기호로 표시하면 단순해집니다.</p>
                </motion.div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
                    {[
                        { symbol: "○", title: "동그라미", desc: "구두연결사 (However...)", color: "text-orange-500", border: "hover:border-orange-200" },
                        { symbol: "V", title: "밑줄", desc: "모든 본동사 체크", color: "text-blue-600 underline decoration-2 decoration-blue-600 underline-offset-4", border: "hover:border-blue-200" },
                        { symbol: "/ /", title: "준명사", desc: "준동사(To-v/v-ing), 명사절", color: "text-amber-500", border: "hover:border-amber-200" },
                        { symbol: "△", title: "세모", desc: "등위접속사 (And, But)", color: "text-red-500", border: "hover:border-red-200" },
                        { symbol: "< >", title: "꺽쇠", desc: "종속절/부사절", color: "text-green-600", border: "hover:border-green-200" },
                        { symbol: "( )", title: "괄호", desc: "형용사(절), 부사(절), 전명구 등", color: "text-purple-600", border: "hover:border-purple-200" },
                    ].map((item, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            className={`bg-white p-6 md:p-10 rounded-3xl border border-slate-100 shadow-lg shadow-slate-100/50 flex flex-col items-center justify-center text-center transition-all duration-300 ${item.border} hover:-translate-y-1`}
                        >
                            <div className={`text-3xl md:text-4xl font-bold mb-4 ${item.color}`}>{item.symbol}</div>
                            <h3 className="text-slate-900 font-bold mb-1">{item.title}</h3>
                            <p className="text-xs md:text-sm text-slate-500">{item.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="py-12 text-center text-slate-300 text-sm">
                Designed for Cheonghan English
            </div>

        </div>
    );
}
