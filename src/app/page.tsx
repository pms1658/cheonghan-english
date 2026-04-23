import LoginCard from "@/components/auth/LoginCard";
import LatestNewsSection from "@/components/home/LatestNewsSection";
import ScrollToTop from "@/components/common/ScrollToTop";
import Logo from "@/components/common/Logo";
import ScrollReveal from "@/components/common/ScrollReveal";

export default function Home() {
    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">

            {/* --- HERO SECTION --- */}
            <section className="relative w-full min-h-[100dvh] lg:min-h-screen flex flex-col lg:flex-row items-center justify-center lg:justify-between px-6 lg:px-20 py-12 lg:py-0 overflow-hidden bg-[#0A0E27]">

                {/* Background Decor (High Quality Gradients) */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                    <div className="absolute top-[-10%] right-[-10%] w-[800px] h-[800px] bg-blue-600/30 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow"></div>
                    <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-900/30 rounded-full blur-[100px] mix-blend-screen animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
                    <div className="absolute top-[20%] left-[20%] w-[300px] h-[300px] bg-sky-500/20 rounded-full blur-[80px] animate-float"></div>
                </div>

                {/* Left Content (Brand) */}
                <div className="relative z-10 max-w-3xl text-white text-center mb-12 lg:mb-0 animate-fade-in-up">
                    {/* Hero Logo - Maximized content size (30% increase) within the same container */}
                    <div className="mb-10 relative w-56 h-56 lg:w-72 lg:h-72 mx-auto rounded-[48px] shadow-2xl shadow-blue-900/60 ring-1 ring-white/15 group cursor-default bg-[#083973] p-1.5 lg:p-2 flex items-center justify-center overflow-hidden">
                        <Logo className="w-full h-full transition-transform duration-700 group-hover:scale-105" />

                        {/* Premium Glass Finish */}
                        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
                        <div className="absolute inset-0 rounded-[48px] ring-1 ring-inset ring-white/20 pointer-events-none"></div>
                    </div>

                    <h1 className="text-4xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight leading-tight mb-6 break-keep drop-shadow-lg">
                        <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-white">구조가 보이면</span>
                        <span className="block mt-2">영어가 보인다</span>
                    </h1>

                    <p className="text-lg lg:text-2xl text-blue-100/80 font-medium leading-relaxed max-w-2xl mx-auto break-keep animate-fade-in-up-delay">
                        수능 1등급 비율 단 <span className="text-yellow-400 font-bold">3%</span>의 시대.<br />
                        단순한 해석을 넘어 정답을 꿰뚫는<br className="hidden lg:block" />
                        가장 <span className="text-blue-300 font-bold">효율적인 구조독해 전략</span>을 제시합니다.
                    </p>

                    <div className="mt-10 flex flex-wrap gap-4 justify-center animate-fade-in-up-delay" style={{ animationDelay: '0.5s' }}>
                        <a href="#about" className="px-8 py-4 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-bold transition-all transform hover:scale-105 hover:shadow-lg active:scale-95">
                            학원 소개 보기
                        </a>
                        <a href="#contact" className="px-8 py-4 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-900/50 transition-all transform hover:scale-105 hover:shadow-blue-500/50 active:scale-95">
                            상담 문의
                        </a>
                    </div>
                </div>

                {/* Right Content (Login Card) */}
                <div className="relative z-20 w-full max-w-sm lg:max-w-md perspective-1000 animate-fade-in-up" style={{ animationDelay: '0.7s' }}>
                    <div className="transform transition-transform hover:rotate-y-2 duration-500 hover:scale-[1.02]">
                        <LoginCard />
                    </div>
                </div>

                {/* Scroll Indicator */}
                <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 text-white/30 animate-bounce hidden lg:block hover:text-white transition-colors cursor-pointer">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
                </div>
            </section>

            {/* --- ABOUT SECTION (Why Cheonghan?) --- */}
            <section id="about" className="py-24 px-6 bg-[#0A0E27] relative overflow-hidden">
                {/* Background Ambience */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-blue-900/20 rounded-full blur-[100px]"></div>
                    <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[100px]"></div>
                </div>

                <div className="max-w-7xl mx-auto relative z-10">
                    <ScrollReveal>
                    <div className="text-center mb-16">
                        <span className="text-blue-400 font-bold tracking-wider uppercase text-sm">Why Choose Us</span>
                        <h2 className="text-3xl lg:text-5xl font-black text-white mt-3 drop-shadow-lg">청한영어의 차별점</h2>
                        <p className="text-blue-200/60 mt-4 text-lg font-medium">진짜 실력을 만드는 세 가지 핵심 시스템</p>
                    </div>
                    </ScrollReveal>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <ScrollReveal delay={100}>
                        <div className="group p-8 rounded-[32px] bg-white/5 border border-white/10 hover:bg-white/10 inset-0 hover:shadow-2xl hover:shadow-blue-900/20 transition-all duration-300 transform hover:-translate-y-2 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative z-10">
                                <div className="w-14 h-14 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center mb-6 text-2xl group-hover:scale-110 transition-transform shadow-inner ring-1 ring-white/10">🗣️</div>
                                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-blue-300 transition-colors">세미나식 수업</h3>
                                <p className="text-slate-400 leading-relaxed group-hover:text-slate-200">
                                    학생이 단순히 듣기만 하는 수업은 끝났습니다.<br />
                                    <strong className="text-blue-400">학생이 능동적으로 참여하고 설명하는</strong><br />
                                    세미나식 수업으로 완벽한 이해를 확인합니다.
                                </p>
                            </div>
                        </div>
                        </ScrollReveal>

                        {/* Feature 2 */}
                        <ScrollReveal delay={250}>
                        <div className="group p-8 rounded-[32px] bg-white/5 border border-white/10 hover:bg-white/10 inset-0 hover:shadow-2xl hover:shadow-purple-900/20 transition-all duration-300 transform hover:-translate-y-2 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative z-10">
                                <div className="w-14 h-14 bg-purple-500/20 text-purple-400 rounded-2xl flex items-center justify-center mb-6 text-2xl group-hover:scale-110 transition-transform shadow-inner ring-1 ring-white/10">📚</div>
                                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-purple-300 transition-colors">자체 제작 교재</h3>
                                <p className="text-slate-400 leading-relaxed group-hover:text-slate-200">
                                    시중 교재 NO! <br />
                                    <strong className="text-purple-400">수능에 진짜 필요한 자료</strong>만을 엄선하여<br />
                                    자체 제작한 맞춤형 교재를 사용합니다.
                                </p>
                            </div>
                        </div>
                        </ScrollReveal>

                        {/* Feature 3 */}
                        <ScrollReveal delay={400}>
                        <div className="group p-8 rounded-[32px] bg-white/5 border border-white/10 hover:bg-white/10 inset-0 hover:shadow-2xl hover:shadow-green-900/20 transition-all duration-300 transform hover:-translate-y-2 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative z-10">
                                <div className="w-14 h-14 bg-green-500/20 text-green-400 rounded-2xl flex items-center justify-center mb-6 text-2xl group-hover:scale-110 transition-transform shadow-inner ring-1 ring-white/10">🔍</div>
                                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-green-300 transition-colors">구조독해 시스템</h3>
                                <p className="text-slate-400 leading-relaxed group-hover:text-slate-200">
                                    감으로 푸는 독해는 이제 통하지 않습니다.<br />
                                    <strong className="text-green-400">거시적(Macro) & 미시적(Micro) 독해</strong>의<br />
                                    2단계 접근법으로 정확한 해석을 보장합니다.
                                </p>
                            </div>
                        </div>
                        </ScrollReveal>
                    </div>
                </div>
            </section>

            {/* --- SYSTEM DETAIL (Macro/Micro) --- */}
            <section className="py-24 px-6 bg-[#05081A] text-white overflow-hidden relative border-t border-white/5">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[100px]"></div>

                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <ScrollReveal direction="left">
                        <div>
                            <span className="text-blue-400 font-bold tracking-wider uppercase text-sm">Core Methodology</span>
                            <h2 className="text-3xl lg:text-5xl font-black mt-3 mb-8 text-white drop-shadow-md">구조독해란?</h2>
                            <div className="space-y-8">
                                <div className="flex gap-5">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center font-bold text-xl shrink-0 shadow-lg shadow-blue-900/50">1</div>
                                    <div>
                                        <h3 className="text-xl font-bold mb-2 text-blue-100">거시적 독해 (Macro Reading)</h3>
                                        <p className="text-slate-400 leading-relaxed">
                                            지문에서 <span className="text-white font-bold underline decoration-blue-500 underline-offset-4">필요한 문장만 추려내는 능력</span>을 기릅니다.
                                            강사와 같은 관점으로 글을 보고 핵심 문장을 찾아내는 훈련을 합니다.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-5">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center font-bold text-xl shrink-0 shadow-lg shadow-indigo-900/50">2</div>
                                    <div>
                                        <h3 className="text-xl font-bold mb-2 text-indigo-100">미시적 독해 (Micro Reading)</h3>
                                        <p className="text-slate-400 leading-relaxed">
                                            추려낸 문장을 <span className="text-white font-bold underline decoration-indigo-500 underline-offset-4">단순한 기호 표기를 통해 구조를 파악</span>합니다.
                                            불필요한 내용은 생략하고 핵심만 정확하게 해석하여 문제 풀이 정확도를 극대화합니다.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        </ScrollReveal>
                        <ScrollReveal direction="right" delay={200}>
                        <div className="relative">
                            {/* Visual representation of Structure Analysis */}
                            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[32px] p-8 lg:p-12 shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500 ring-1 ring-white/10 group">
                                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 to-purple-500/5 opacity-50 rounded-[32px]"></div>
                                <div className="relative text-sm lg:text-lg text-blue-100 leading-[2.8] font-medium tracking-tight">
                                    <span className="text-[#ff3b30] font-bold text-xl mr-1 group-hover:text-[#ff6b60] transition-colors">△</span>
                                    <span className="text-[#ff9500] font-bold group-hover:text-[#ffb340] transition-colors">However,</span>{' '}
                                    <span className="border-b-2 border-[#0071e3] text-[#7ab8ff] group-hover:text-[#90c8ff] transition-colors">recognizing</span>{' '}
                                    <span className="text-[#ffcc00] font-bold">/</span>
                                    <span className="text-[#e6b800] font-bold group-hover:text-[#ffcc00] transition-colors">the value </span>
                                    <span className="text-[#af52de] group-hover:text-[#c97bef] transition-colors">(of cultural diversity)</span>
                                    <span className="text-[#ffcc00] font-bold">/</span>{' '}
                                    <span className="border-b-2 border-[#0071e3] text-[#7ab8ff] group-hover:text-[#90c8ff] transition-colors">requires</span>{' '}
                                    <span className="text-[#ffcc00] font-bold">/</span>
                                    <span className="text-slate-200">that </span>
                                    <span className="text-slate-200">we </span>
                                    <span className="border-b-2 border-[#0071e3] text-[#7ab8ff] group-hover:text-[#90c8ff] transition-colors">move</span>{' '}
                                    <span className="text-[#28cd41] group-hover:text-[#61e374] transition-colors">&lt;</span>
                                    <span className="text-slate-200">beyond </span>
                                    <span className="text-[#af52de] group-hover:text-[#c97bef] transition-colors">(familiar)</span>{' '}
                                    <span className="text-slate-200">perspectives</span>
                                    <span className="text-[#28cd41] group-hover:text-[#61e374] transition-colors">&gt;</span>
                                    <span className="text-[#ffcc00] font-bold">/</span>
                                    <span className="text-slate-300">.</span>
                                </div>
                                {/* Legend */}
                                <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap gap-x-4 gap-y-2 justify-center">
                                    <span className="flex items-center gap-1.5 text-[11px] text-slate-400"><span className="w-2 h-2 rounded-full bg-[#0071e3]"></span>동사</span>
                                    <span className="flex items-center gap-1.5 text-[11px] text-slate-400"><span className="w-2 h-2 rounded-full bg-[#ffcc00]"></span>준명사</span>
                                    <span className="flex items-center gap-1.5 text-[11px] text-slate-400"><span className="w-2 h-2 rounded-full bg-[#af52de]"></span>수식어</span>
                                    <span className="flex items-center gap-1.5 text-[11px] text-slate-400"><span className="w-2 h-2 rounded-full bg-[#28cd41]"></span>종속접속사</span>
                                    <span className="flex items-center gap-1.5 text-[11px] text-slate-400"><span className="w-2 h-2 rounded-full bg-[#ff3b30]"></span>등위접속사</span>
                                    <span className="flex items-center gap-1.5 text-[11px] text-slate-400"><span className="w-2 h-2 rounded-full bg-[#ff9500]"></span>연결사</span>
                                </div>
                            </div>
                        </div>
                        </ScrollReveal>
                    </div>
                </div>
            </section>

            {/* --- INSTRUCTOR PROFILE --- */}
            <section className="py-24 px-6 bg-[#0A0E27] relative overflow-hidden">
                {/* Background Ambience */}
                <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-[30%] left-[-10%] w-[600px] h-[600px] bg-blue-800/10 rounded-full blur-[120px]"></div>
                </div>

                <ScrollReveal direction="scale">
                <div className="max-w-5xl mx-auto bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] shadow-2xl overflow-hidden flex flex-col lg:flex-row relative z-10">
                    <div className="bg-white/5 p-10 lg:p-16 text-white lg:w-1/3 flex flex-col justify-center text-center lg:text-left border-b lg:border-b-0 lg:border-r border-white/10 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent opacity-50"></div>
                        <div className="relative z-10">
                            <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 mb-6 mx-auto lg:mx-0 rounded-full"></div>
                            <h2 className="text-3xl font-black mb-2 drop-shadow-md">박민식 원장</h2>
                            <p className="text-blue-200 font-bold text-sm tracking-widest uppercase">Head Instructor</p>
                        </div>
                    </div>
                    <div className="p-10 lg:p-16 lg:w-2/3 bg-transparent">
                        <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-3">
                            <span className="w-2 h-8 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.6)]"></span>
                            학력 및 약력
                        </h3>
                        <ul className="space-y-5 text-slate-300 font-medium text-lg">
                            <li className="flex items-start gap-3 group">
                                <span className="text-blue-500 mt-1 group-hover:text-blue-400 transition-colors">✓</span>
                                <span className="group-hover:text-white transition-colors">미국 Tennessee주 Knoxville 출생 / California Albany High School 재학</span>
                            </li>
                            <li className="flex items-start gap-3 group">
                                <span className="text-blue-500 mt-1 group-hover:text-blue-400 transition-colors">✓</span>
                                <span className="group-hover:text-white transition-colors">한국외국어대학교 영어영문학과 학사 / 대학원 영어영문학과 석사수료</span>
                            </li>
                            <li className="flex items-start gap-3 group">
                                <span className="text-blue-500 mt-1 group-hover:text-blue-400 transition-colors">✓</span>
                                <span className="group-hover:text-white transition-colors">前 남천동 김현PT영어 고등부 담당 (5년)</span>
                            </li>
                            <li className="flex items-start gap-3 group">
                                <span className="text-blue-500 mt-1 group-hover:text-blue-400 transition-colors">✓</span>
                                <span className="group-hover:text-white transition-colors">다년간 토플 및 성인영어회화 강의</span>
                            </li>
                        </ul>
                    </div>
                </div>
                </ScrollReveal>
            </section>

            <LatestNewsSection />

            {/* --- FOOTER (Location & Contact) --- */}
            <footer id="contact" className="bg-[#05081A] text-slate-400 py-16 px-6 border-t border-white/5">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 relative rounded-lg overflow-hidden bg-[#083973] p-1.5 shadow-md">
                                <img src="/logo.svg" alt="청한영어" className="w-full h-full object-contain" />
                            </div>
                            <span className="text-white font-bold text-xl">청한영어 교습소</span>
                        </div>
                        <p className="text-sm leading-relaxed mb-6">
                            구조독해를 통해 영어의 본질을 꿰뚫습니다.<br />
                            학생 한 명 한 명의 성장을 진심으로 응원하고 함께합니다.
                        </p>
                        <div className="flex gap-4">
                            {/* SNS Icons Placeholder */}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-white font-bold mb-4">Contact Us</h4>
                        <div className="flex items-start gap-4">
                            <div className="mt-1 w-5 h-5 text-blue-500 shrink-0">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                            </div>
                            <span>부산광역시 수영구 남천동로16번길 8, 2층<br />(남천역 1번 출구 도보 3분)</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-5 h-5 text-blue-500 shrink-0">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                            </div>
                            <a href="tel:010-6847-2833" className="text-white font-bold text-lg hover:text-blue-400 transition-colors">010-6847-2833</a>
                        </div>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-white/5 text-center text-xs text-slate-600">
                    © 2026 Cheonghan English. All rights reserved.
                </div>
            </footer>
            <ScrollToTop />
        </div>
    );
}

