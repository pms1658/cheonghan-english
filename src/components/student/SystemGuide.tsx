'use client';

import { useState } from 'react';

export default function SystemGuide() {
    const [activeTab, setActiveTab] = useState<'hierarchy' | 'patterns' | 'markers'>('hierarchy');

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                    <span className="text-4xl">📘</span>
                    <div>
                        <span className="block text-sm text-blue-600 font-bold uppercase tracking-wider mb-1">Learning Guide</span>
                        청한영어 필승 구문독해 시스템
                    </div>
                </h2>
                <p className="text-slate-500 mt-4 max-w-2xl leading-relaxed">
                    단어만 나열하는 해석은 이제 그만!<br className="hidden md:inline" /> <b className="text-slate-800">품사의 계급</b>과 <b className="text-slate-800">문장의 5형식</b>, 그리고 <b className="text-slate-800">구조 기호</b>를 통해 문장을 꿰뚫어보세요.
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                    onClick={() => setActiveTab('hierarchy')}
                    className={`flex-1 py-2 sm:py-3 px-1 sm:px-4 rounded-lg text-[13px] sm:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'hierarchy' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <span className="sm:hidden">👑 품사</span>
                    <span className="hidden sm:inline">👑 품사 계급도</span>
                </button>
                <button
                    onClick={() => setActiveTab('patterns')}
                    className={`flex-1 py-2 sm:py-3 px-1 sm:px-4 rounded-lg text-[13px] sm:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'patterns' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <span className="sm:hidden">🏗️ 5형식</span>
                    <span className="hidden sm:inline">🏗️ 문장의 5형식</span>
                </button>
                <button
                    onClick={() => setActiveTab('markers')}
                    className={`flex-1 py-2 sm:py-3 px-1 sm:px-4 rounded-lg text-[13px] sm:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'markers' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <span className="sm:hidden">🖍️ 기호</span>
                    <span className="hidden sm:inline">🖍️ 구조독해 표시법</span>
                </button>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-4 md:p-6 lg:p-10 shadow-sm">
                {/* Tab: Hierarchy */}
                {activeTab === 'hierarchy' && (
                    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
                        <div className="text-center mb-10">
                            <h3 className="text-2xl font-bold text-slate-800">품사 계급도 (Hierarchy)</h3>
                            <p className="text-slate-500 mt-2">
                                고등 독해를 위한 <b className="text-slate-800">필수 문법 사항</b>을 계급별로 정리했습니다.<br />
                                <span className="text-xs text-slate-400">※ 미시구조독해: 문장의 뼈대를 잡아 정확히 영어 어순으로 이해하기 위한 독해법</span>
                            </p>
                        </div>

                        <div className="space-y-6">
                            {/* King: Noun */}
                            <div className="relative overflow-hidden bg-amber-50 rounded-2xl p-6 border-2 border-amber-200 shadow-sm flex flex-col md:flex-row gap-6 items-center md:items-start hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                                <div className="flex-shrink-0 flex flex-col items-center justify-center w-full md:w-32 pt-2 border-b md:border-b-0 md:border-r border-amber-200/50 pb-6 md:pb-0 md:pr-6">
                                    <div className="text-6xl mb-2">👑</div>
                                    <span className="bg-amber-200 text-amber-900 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide mb-1">King</span>
                                    <span className="font-bold text-amber-900">명사 (Noun)</span>
                                </div>
                                <div className="flex-1 w-full text-sm text-slate-700 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-white/60 p-3 rounded-xl">
                                            <b className="text-amber-800 block mb-2 border-b border-amber-200 pb-1">1. 명사 (이름)</b>
                                            <ul className="list-disc list-inside space-y-1 text-xs">
                                                <li>셀 수 있는/없는 명사, 단수/복수 형태 구분</li>
                                                <li><span className="font-bold text-slate-800">명사 상당어구</span> (길어진 명사):
                                                    <div className="pl-4 text-slate-600 mt-1 space-y-0.5">
                                                        - 동명사(v-ing), To부정사<br />
                                                        - 명사절: That, What, If/Whether<br />
                                                        - 의문사절, 복합관계사절
                                                    </div>
                                                </li>
                                                <li className="text-red-500 font-bold mt-1">※ 관계대명사 What: 선행사X, 불완전한 문장</li>
                                            </ul>
                                        </div>
                                        <div className="bg-white/60 p-3 rounded-xl">
                                            <b className="text-amber-800 block mb-2 border-b border-amber-200 pb-1">2. 대명사 (명사 대신)</b>
                                            <ul className="list-disc list-inside space-y-1 text-xs">
                                                <li><b className="text-slate-800">지칭 수일치</b>: 가리키는 대상의 단/복수 확인 (it/that vs them/those)</li>
                                                <li><b className="text-slate-800">재귀대명사</b>: 주어 = 목적어일 때 (-self)</li>
                                                <li><b className="text-slate-800">가짜 왕 (It)</b>: 가주어/가목적어 It (뒤에 진짜 왕 to-V/that절 확인)</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Queen: Verb */}
                            <div className="relative overflow-hidden bg-rose-50 rounded-2xl p-6 border-2 border-rose-200 shadow-sm flex flex-col md:flex-row gap-6 items-center md:items-start hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                                <div className="flex-shrink-0 flex flex-col items-center justify-center w-full md:w-32 pt-2 border-b md:border-b-0 md:border-r border-rose-200/50 pb-6 md:pb-0 md:pr-6">
                                    <div className="text-6xl mb-2">👸</div>
                                    <span className="bg-rose-200 text-rose-900 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide mb-1">Queen</span>
                                    <span className="font-bold text-rose-900">동사 (Verb)</span>
                                </div>
                                <div className="flex-1 w-full text-sm text-slate-700 space-y-4">
                                    <div className="bg-white/60 p-4 rounded-xl">
                                        <b className="text-rose-800 block mb-2 border-b border-rose-200 pb-1">3. 동사 (Verb)</b>
                                        <ul className="list-disc list-inside space-y-2 text-xs">
                                            <li><span className="bg-rose-100 text-rose-800 px-1 rounded font-bold">1문장 1동사 원칙</span>: 접속사 없이는 동사가 하나뿐이어야 함.</li>
                                            <li><span className="bg-rose-100 text-rose-800 px-1 rounded font-bold">수일치 (S-V Agreement)</span>:
                                                <div className="pl-4 mt-1 text-slate-600 space-y-1">
                                                    - 단수 취급: To부정사, 동명사, 명사절, Each/Every, The number of<br />
                                                    - 복수 취급: (Both) A and B, A number of + 복수명사<br />
                                                    - 부분표현(All/Most/Some/Half) + of 명사 → 뒤의 명사에 수일치<br />
                                                    - 도치 문장: (조)동사 뒤에 있는 주어 찾기
                                                </div>
                                            </li>
                                            <li><span className="bg-rose-100 text-rose-800 px-1 rounded font-bold">시제 & 태</span>: 완료시제(have p.p), 수동태(be p.p - 목적어 유무 확인)</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Noble: Adjective */}
                            <div className="relative overflow-hidden bg-purple-50 rounded-2xl p-6 border-2 border-purple-200 shadow-sm flex flex-col md:flex-row gap-6 items-center md:items-start hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                                <div className="flex-shrink-0 flex flex-col items-center justify-center w-full md:w-32 pt-2 border-b md:border-b-0 md:border-r border-purple-200/50 pb-6 md:pb-0 md:pr-6">
                                    <div className="text-6xl mb-2">🤵</div>
                                    <span className="bg-purple-200 text-purple-900 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide mb-1">Noble</span>
                                    <span className="font-bold text-purple-900">형용사 (Adj)</span>
                                </div>
                                <div className="flex-1 w-full text-sm text-slate-700 space-y-4">
                                    <div className="bg-white/60 p-4 rounded-xl">
                                        <b className="text-purple-800 block mb-2 border-b border-purple-200 pb-1">4. 형용사 (Adjective)</b>
                                        <ul className="list-disc list-inside space-y-2 text-xs">
                                            <li>기본: 명사+y/ly 형태</li>
                                            <li><span className="font-bold text-slate-800">관계대명사절</span> (Who/Which/That):
                                                <div className="pl-4 mt-1 text-slate-600 -indent-4">
                                                    - 선행사O, <b className="text-red-500">불완전한 문장</b><br />
                                                    - 생략 가능: 목적격 관대, 주격 관대 + be동사
                                                </div>
                                            </li>
                                            <li><span className="font-bold text-slate-800">관계부사절</span> (When/Where/Why/How):
                                                <div className="pl-4 mt-1 text-slate-600 -indent-4">
                                                    - 전치사 + 관계대명사<br />
                                                    - 뒤에 <b className="text-blue-500">완전한 문장</b>
                                                </div>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Serf: The Remaining 4 Parts of Speech */}
                            <div className="relative overflow-hidden bg-teal-50 rounded-2xl p-6 border-2 border-teal-200 shadow-sm flex flex-col md:flex-row gap-6 items-center md:items-start hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                                <div className="flex-shrink-0 flex flex-col items-center justify-center w-full md:w-32 pt-2 border-b md:border-b-0 md:border-r border-teal-200/50 pb-6 md:pb-0 md:pr-6">
                                    <div className="text-6xl mb-2">🧑‍🌾</div>
                                    <span className="bg-teal-200 text-teal-900 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide mb-1">Peasant</span>
                                    <span className="font-bold text-teal-900 text-center">나머지 4품사<br /><span className="text-[10px] opacity-80">(Modifiers & Function Words)</span></span>
                                </div>
                                <div className="flex-1 w-full text-sm text-slate-700">
                                    <div className="mb-4 bg-white/60 p-3 rounded-xl text-xs text-slate-600 border border-teal-100">
                                        <b className="text-teal-800">8품사 중 나머지 4개</b>는 문장의 뼈대(주어/동사/목적어/보어)가 될 수 없는, <b className="text-slate-800">수식어(Modifier)나 연결어</b> 역할을 하는 &apos;농노(Peasant)&apos; 계급입니다.
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Adverb */}
                                        <div className="bg-white p-3 rounded-xl border border-teal-100 shadow-sm">
                                            <b className="text-slate-800 block mb-1">5. 부사 (Adverb)</b>
                                            <p className="text-xs text-slate-500 mb-2">동사/형용사/부사/문장전체 수식 (이/히/리/개). 형용사+ly.</p>
                                            <div className="text-[10px] bg-slate-50 p-1.5 rounded text-slate-400">
                                                * late, hard, fast, high 등은 형용사/부사 형태 동일
                                            </div>
                                        </div>

                                        {/* Conjunction */}
                                        <div className="bg-white p-3 rounded-xl border border-teal-100 shadow-sm">
                                            <b className="text-slate-800 block mb-1">6. 접속사 (Conjunction)</b>
                                            <ul className="text-xs text-slate-500 list-disc list-inside">
                                                <li>등위접속사 (and, but, or): 문장/구/절 대등 연결</li>
                                                <li>종속접속사 (that, if, because): 문장만 연결</li>
                                                <li><span className="text-red-500">생략:</span> (생각)동사 뒤 목적어절 that</li>
                                            </ul>
                                        </div>

                                        {/* Preposition */}
                                        <div className="bg-white p-3 rounded-xl border border-teal-100 shadow-sm">
                                            <b className="text-slate-800 block mb-1">7. 전치사 (Preposition)</b>
                                            <p className="text-xs text-slate-500">
                                                앞(Pre)에 위치(Position)하여 명사의 역할을 정해줌.<br />
                                                <span className="font-bold">전치사 + 목적어(명사) = 수식어구 (전명구)</span>
                                            </p>
                                        </div>

                                        {/* Exclamation */}
                                        <div className="bg-white p-3 rounded-xl border border-teal-100 shadow-sm">
                                            <b className="text-slate-800 block mb-1">8. 감탄사 (Interjection)</b>
                                            <p className="text-xs text-slate-500">감탄을 나타내는 독립적 요소</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: Patterns */}
                {activeTab === 'patterns' && (
                    <div className="space-y-12 animate-fade-in">
                        {/* Sentence Components Definition */}
                        <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200">
                            <h3 className="text-xl font-bold text-slate-800 mb-6 text-center">문장성분 (Sentence Components) 분석</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-white p-4 rounded-xl border-l-4 border-amber-400 shadow-sm">
                                    <div className="font-black text-amber-600 text-lg mb-1">주어 (Subject)</div>
                                    <div className="text-xs text-slate-500 font-bold mb-2">사용품사: 명사, 대명사</div>
                                    <div className="text-sm text-slate-700">해석: ~은/는/이/가</div>
                                </div>
                                <div className="bg-white p-4 rounded-xl border-l-4 border-rose-400 shadow-sm">
                                    <div className="font-black text-rose-600 text-lg mb-1">동사 (Verb)</div>
                                    <div className="text-xs text-slate-500 font-bold mb-2">사용품사: 동사</div>
                                    <div className="text-sm text-slate-700">해석: ~다 (동작/상태)</div>
                                </div>
                                <div className="bg-white p-4 rounded-xl border-l-4 border-amber-400 shadow-sm">
                                    <div className="font-black text-amber-600 text-lg mb-1">목적어 (Objective)</div>
                                    <div className="text-xs text-slate-500 font-bold mb-2">사용품사: 명사, 대명사</div>
                                    <div className="text-sm text-slate-700">해석: ~을/를, ~에게</div>
                                </div>
                                <div className="bg-white p-4 rounded-xl border-l-4 border-purple-400 shadow-sm">
                                    <div className="font-black text-purple-600 text-lg mb-1">보어 (Complement)</div>
                                    <div className="text-xs text-slate-500 font-bold mb-2">사용품사: 명사, 형용사</div>
                                    <div className="text-sm text-slate-700">해석: ~라고, ~(한 상태)이다</div>
                                </div>
                            </div>
                            <p className="text-center text-xs text-slate-400 mt-4">
                                ※ 위 4개의 필수 문장성분을 제외하면, 나머지는 다 수식어(M)입니다.
                            </p>
                        </div>

                        {/* Intransitive Group */}
                        <div>
                            <div className="flex items-center gap-4 mb-6">
                                <h4 className="text-xl font-black text-slate-700">1. 자동사 (목적어 X)</h4>
                                <div className="h-px bg-slate-200 flex-1"></div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* 1형식 */}
                                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none text-8xl font-black text-slate-400 -mt-2 -mr-2">1</div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-black shadow-inner">1</div>
                                        <div className="font-black text-xl text-slate-800 tracking-tight">S + V</div>
                                    </div>
                                    <div className="space-y-3 text-sm">
                                        <p className="text-slate-700 font-bold">S는 V다</p>
                                        <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1 text-slate-600">
                                            <p className="pl-4 -indent-4">① <b>완전자동사:</b> go, come, arrive, happen, exist, rise, appear</p>
                                            <p className="pl-4 -indent-4">② <b>유도부사:</b> There + be + S (주어가 뒤에 있음, 수일치 주의)</p>
                                        </div>
                                    </div>
                                </div>

                                {/* 2형식 */}
                                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none text-8xl font-black text-slate-400 -mt-2 -mr-2">2</div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-black shadow-inner">2</div>
                                        <div className="font-black text-xl text-slate-800 tracking-tight">S + V + C</div>
                                    </div>
                                    <div className="space-y-3 text-sm">
                                        <p className="text-slate-700 font-bold">S는 C이다 / C하게 V하다</p>
                                        <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-2 text-slate-600">
                                            <p className="pl-4 -indent-4">① <b>Be동사:</b> ~이다 (S=C)</p>
                                            <p className="pl-4 -indent-4">② <b>감각동사:</b> look, feel, taste, smell, sound (<b className="text-red-500">형용사만 가능</b>)</p>
                                            <p className="pl-4 -indent-4">③ <b>상태변화:</b> become, remain, turn (~상태가 되다/남다)</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Transitive Group */}
                        <div>
                            <div className="flex items-center gap-4 mb-6">
                                <h4 className="text-xl font-black text-slate-700">2. 타동사 (목적어 O)</h4>
                                <div className="h-px bg-slate-200 flex-1"></div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* 3형식 */}
                                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none text-8xl font-black text-slate-400 -mt-2 -mr-2">3</div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-600 flex items-center justify-center font-black shadow-inner">3</div>
                                        <div className="font-black text-xl text-slate-800 tracking-tight">S+V+O</div>
                                    </div>
                                    <div className="space-y-3 text-sm">
                                        <p className="text-slate-700 font-bold">S는 O를 V하다</p>
                                        <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1 text-slate-600">
                                            <p className="pl-4 -indent-4">① 목적어 자리에 명사/대명사/명사절/TO부정사/동명사 모두 가능</p>
                                            <p className="pl-4 -indent-4">② 가장 흔한 문장 구조</p>
                                        </div>
                                    </div>
                                </div>

                                {/* 4형식 */}
                                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none text-8xl font-black text-slate-400 -mt-2 -mr-2">4</div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-black shadow-inner">4</div>
                                        <div className="font-black text-xl text-slate-800 tracking-tight">S+V+IO+DO</div>
                                    </div>
                                    <div className="space-y-3 text-sm">
                                        <p className="text-slate-700 font-bold">~에게 ~를 주다</p>
                                        <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1 text-slate-600">
                                            <p className="pl-4 -indent-4">① <b>수여동사:</b> give, send, tell, make, offer</p>
                                            <p className="pl-4 -indent-4">② 순서: 받는 사람(IO) + 물건(DO)</p>
                                        </div>
                                    </div>
                                </div>

                                {/* 5형식 */}
                                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none text-8xl font-black text-slate-400 -mt-2 -mr-2">5</div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center font-black shadow-inner">5</div>
                                        <div className="font-black text-xl text-slate-800 tracking-tight">S+V+O+O.C</div>
                                    </div>
                                    <div className="space-y-3 text-sm">
                                        <p className="text-slate-700 font-bold text-center border-b border-slate-50 pb-2 mb-2">O가 O.C하도록 V하다 (목적어와 보어는 주술관계)</p>

                                        <div className="space-y-2">
                                            <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 flex flex-wrap items-center justify-between gap-1">
                                                <div className="text-xs font-bold text-slate-700">사역 <span className="text-rose-500 font-normal text-[11px]">(Make/Have/Let)</span></div>
                                                <div className="text-xs text-blue-600 font-bold">➡ 동사원형</div>
                                            </div>
                                            <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 flex flex-wrap items-center justify-between gap-1">
                                                <div className="text-xs font-bold text-slate-700">지각 <span className="text-rose-500 font-normal text-[11px]">(See/Hear/Feel)</span></div>
                                                <div className="text-xs text-blue-600 font-bold">➡ 원형/v-ing</div>
                                            </div>
                                            <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 flex flex-wrap items-center justify-between gap-1">
                                                <div className="text-xs font-bold text-slate-700">준사역/기타 <span className="text-rose-500 font-normal text-[11px]">(Get/Allow..)</span></div>
                                                <div className="text-xs text-blue-600 font-bold flex items-center gap-1">
                                                    ➡ to-v <span className="text-[10px] text-slate-400 font-medium bg-white px-1 rounded border border-slate-100">Help:원형가능</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: Markers */}
                {activeTab === 'markers' && (
                    <div className="space-y-8 animate-fade-in">
                        <div className="text-center mb-6">
                            <h3 className="text-2xl font-bold text-slate-800">구조독해 표시법 (Symbols)</h3>
                            <p className="text-slate-500 mt-2">문장 성분을 기호로 표시하여 구조를 시각화합니다.</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {/* Circle */}
                            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="text-xl font-bold text-orange-500 border-2 border-orange-500 rounded-full w-8 h-8 flex items-center justify-center">O</div>
                                </div>
                                <h4 className="font-bold text-slate-800 mb-1">동그라미 (Circle)</h4>
                                <p className="text-xs text-slate-500">구조연결사 (However, For example 등)</p>
                            </div>

                            {/* Underline */}
                            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="text-xl font-bold text-blue-600 underline underline-offset-4">V</div>
                                </div>
                                <h4 className="font-bold text-slate-800 mb-1">밑줄 (Underline)</h4>
                                <p className="text-xs text-slate-500">모든 동사에 밑줄 (준동사는 제외)</p>
                            </div>

                            {/* Slash */}
                            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="text-xl font-bold text-amber-500">/ ... /</div>
                                </div>
                                <h4 className="font-bold text-slate-800 mb-1">슬래시 (Slash)</h4>
                                <p className="text-xs text-slate-500">준명사 (To부정사, 동명사, 명사절)</p>
                            </div>

                            {/* Triangle */}
                            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="text-xl font-bold text-red-500">△</div>
                                </div>
                                <h4 className="font-bold text-slate-800 mb-1">세모 (Triangle)</h4>
                                <p className="text-xs text-slate-500">등위접속사 (and, but, or) - 병렬구조 확인</p>
                            </div>

                            {/* Angle Brackets */}
                            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="text-xl font-bold text-green-600">&lt; ... &gt;</div>
                                </div>
                                <h4 className="font-bold text-slate-800 mb-1">꺽쇠 (Angle Brackets)</h4>
                                <p className="text-xs text-slate-500">종속접속사/부사절 (since, because, if)</p>
                            </div>

                            {/* Parentheses */}
                            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="text-xl font-bold text-purple-600">( ... )</div>
                                </div>
                                <h4 className="font-bold text-slate-800 mb-1">괄호 (Parentheses)</h4>
                                <p className="text-xs text-slate-500">수식성분 (전명구, 관계사절 등 형용사/부사 역할)</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
