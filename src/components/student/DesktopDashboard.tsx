'use client';

import React from 'react';
import Link from 'next/link';
import Logo from '@/components/common/Logo';
import { StudentDashboardData, FilterType } from '@/hooks/useStudentDashboard';
import { useState } from 'react';
import ResultHistoryModal from './ResultHistoryModal';
import SystemGuide from './SystemGuide';
import StructurePrintModal from './StructurePrintModal';
import { useRouter } from 'next/navigation';


import WorkbookList from './workbook/WorkbookList';
import WorkbookDetail from './workbook/WorkbookDetail';
import WorkbookAssignmentView from './WorkbookAssignmentView';


export default function DesktopDashboard({
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
    studentId,
    myClasses,
}: StudentDashboardData & { studentId?: string }) {

    const router = useRouter();
    const [historyTarget, setHistoryTarget] = useState<{ id: string, title: string, type?: string } | null>(null);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [expandedSelections, setExpandedSelections] = useState<Set<string>>(new Set());

    // Workbook State
    const [viewMode, setViewMode] = useState<'dashboard' | 'workbook' | 'my-classes'>('my-classes');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null); // [New] Filter by Class


    return (
        <div className="flex min-h-screen bg-[#F8FAFC] relative overflow-hidden font-sans">
            {/* Global Background Ambient */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-blue-100/50 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-100/30 rounded-full blur-[100px]"></div>
            </div>

            <aside className="w-64 bg-[#0A0E27] flex-shrink-0 flex flex-col fixed h-full z-10 left-0 top-0 overflow-y-auto text-white shadow-2xl">
                {/* ... Logo Section ... */}
                {/* Global Logo Area */}
                <div className="relative z-10 pt-10 pb-6 flex flex-col items-center justify-center border-b border-white/5">
                    {/* Logo Area */}
                    <div className="w-11 h-11 relative bg-[#083973] rounded-xl shadow-lg ring-1 ring-white/10 overflow-hidden flex items-center justify-center p-1.5 transition-all duration-300">
                        <Logo className="w-full h-full" />

                        {/* Subtle Premium Glint */}
                        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
                        <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10 pointer-events-none"></div>
                    </div>

                    <div className="mt-4 px-4 py-1.5 bg-gradient-to-r from-blue-900/50 to-indigo-900/50 backdrop-blur-md rounded-full text-[10px] font-bold tracking-[0.2em] text-blue-100 uppercase border border-white/10 shadow-lg mb-4">
                        Student Mode
                    </div>

                    <div className="flex gap-2 w-full px-6">
                        <button
                            onClick={() => setShowPasswordModal(true)}
                            className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg transition-all text-xs font-bold border border-white/5"
                            title="비밀번호 변경"
                        >
                            PW 변경
                        </button>
                        <button
                            onClick={logout}
                            className="flex-1 py-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition-all text-xs font-bold border border-red-500/20"
                            title="로그아웃"
                        >
                            로그아웃
                        </button>
                    </div>

                </div>


                {/* Navigation */}
                <nav className="relative z-10 flex-1 px-4 py-8 space-y-3 overflow-y-auto">


                    {/* Structure Guide - Sidebar Navigation */}
                    <div className="px-4 mb-4">
                        <button
                            onClick={() => setFilter('guide')}
                            className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-left transition-all duration-200 group border
                            ${filter === 'guide'
                                    ? 'bg-emerald-500/15 text-emerald-300 font-bold border-emerald-500/20 shadow-sm'
                                    : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10 hover:text-white'
                                } `}
                        >
                            <svg className={`w-5 h-5 flex-shrink-0 ${filter === 'guide' ? 'text-emerald-400' : 'text-slate-500'} `} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                            <span className="text-sm">구조독해 가이드</span>
                        </button>
                    </div>

                    {/* Structure Print Button */}
                    <div className="px-4 mb-4">
                        <button
                            onClick={() => setShowPrintModal(true)}
                            className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-left transition-all duration-200 group border bg-white/5 border-transparent text-slate-400 hover:bg-white/10 hover:text-white`}
                        >
                            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                            <span className="text-sm">구조독해 인쇄</span>
                        </button>
                    </div>

                    {/* Filter Tabs */}
                    {filter !== 'guide' && (
                        <div className="space-y-1 mt-2">
                            <div className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 mt-4">
                                <span>Status</span>
                                <div className="h-px bg-white/10 flex-1"></div>
                            </div>
                            {[
                                { id: 'my_classes', label: '내 클래스', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 2 0 011 1v5m-4 0h4' },
                                { id: 'all', label: '전체 과제', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
                                { id: 'in_progress', label: '진행 중', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
                                { id: 'completed', label: '완료됨', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
                            ].map((item) => {
                                const isActive = item.id === 'my_classes' ? viewMode === 'my-classes' : (viewMode === 'dashboard' && filter === item.id);
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            if (item.id === 'my_classes') {
                                                setViewMode('my-classes');
                                            } else {
                                                setViewMode('dashboard');
                                                setFilter(item.id as FilterType);
                                            }
                                        }}
                                        className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-left transition-all duration-200 group relative
                                        ${isActive
                                                ? 'text-white font-bold bg-white/10 shadow-sm border border-white/10'
                                                : 'text-slate-400 hover:bg-white/10 hover:text-white border border-transparent'
                                            } `}
                                    >
                                        <svg className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'text-blue-400 scale-110' : 'text-slate-500 group-hover:scale-110'} `} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon}></path>
                                        </svg>
                                        <span className="text-sm relative z-10">{item.label}</span>
                                        {isActive && <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-blue-400"></div>}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-64 p-8 xl:p-12 min-h-screen relative z-10 flex flex-col">
                {/* Header Section */}
                <header className="flex items-center justify-between mb-8 relative z-10">
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                            <span>반가워요, <span className="text-blue-600 cursor-default underline decoration-blue-200 decoration-4 underline-offset-4 hover:decoration-blue-400 transition-all">{studentName} </span> 학생!</span>
                            <span className="text-3xl animate-bounce-slow">👋</span>
                        </h2>
                        <p className="text-slate-500 mt-3 font-medium text-lg">
                            오늘도 목표를 향해 한 걸음 더 나아가볼까요?
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="px-5 py-2.5 bg-white rounded-2xl text-sm text-slate-600 font-bold border border-slate-100 shadow-sm flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
                        </div>
                    </div>
                </header>

                {/* [NEW] Alert Section for Uncompleted Assignments - Clean Style */}
                {/* Only show alert in main dashboard (Total Assignments or Specific Class) */}
                {viewMode === 'dashboard' && filter !== 'guide' && (
                    <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {(() => {
                            // Calculate based on current filter (All or Selected Class)
                            const targetAssignments = selectedClassId
                                ? assignments.filter(a => (a.classIds || []).includes(selectedClassId) || a.classId === selectedClassId)
                                : assignments;

                            const incompleteCount = targetAssignments.filter(a => a.status !== 'completed').length;
                            if (incompleteCount > 0) {
                                return (
                                    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-start gap-4 hover-lift">
                                        <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center text-2xl shadow-sm flex-shrink-0">
                                            🔥
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800 mb-1">학습이 필요한 과제가 <span className="text-orange-600">{incompleteCount}개</span> 있어요!</h3>
                                            <p className="text-sm text-slate-500 mb-3 font-medium">미완료된 과제를 완료하고 실력을 키워보세요.</p>
                                            <button
                                                onClick={() => {
                                                    // If we are in 'Total', just filter to in_progress.
                                                    // If in class, filter to in_progress within that class.
                                                    setFilter('in_progress');
                                                }}
                                                className="text-xs font-bold px-4 py-2 bg-orange-50 border border-orange-100 text-orange-700 rounded-xl hover:bg-orange-100 transition-colors flex items-center gap-1"
                                            >
                                                할 일 보러가기 &rarr;
                                            </button>
                                        </div>
                                    </div>
                                );
                            } else {
                                return (
                                    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-start gap-4 hover-lift">
                                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-2xl shadow-sm flex-shrink-0">
                                            🎉
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800 mb-1">모든 과제를 완료했어요!</h3>
                                            <p className="text-sm text-slate-500 font-medium">정말 대단해요! 꾸준한 학습이 실력을 만듭니다.</p>
                                        </div>
                                    </div>
                                );
                            }
                        })()}
                    </div>
                )}

                <div className="p-0 pb-20 relative z-10">
                    <div className="bg-white rounded-[32px] shadow-sm border border-slate-200/60 p-8 min-h-[700px]">

                        {viewMode === 'my-classes' ? (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                    <span>🏫</span> 내 클래스
                                </h2>
                                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                                    <div className="divide-y divide-slate-100">
                                        {myClasses.map(cls => (
                                            <div
                                                key={cls.id}
                                                onClick={() => {
                                                    setSelectedClassId(cls.id);
                                                    setViewMode('dashboard');
                                                    setFilter('all');
                                                }}
                                                className="p-5 flex items-center justify-between hover:bg-slate-50/50 cursor-pointer transition-all group hover-lift"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 2 0 011 1v5m-4 0h4"></path></svg>
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-800 text-lg group-hover:text-blue-700 transition-colors">
                                                            {cls.name}
                                                        </h3>
                                                        <p className="text-sm text-slate-400 font-medium">바로가기</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs px-3 py-1.5 bg-slate-100 rounded-lg text-slate-500 font-bold group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                                        Class Room
                                                    </span>
                                                    <svg className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : viewMode === 'workbook' ? (
                            selectedCategory ? (
                                <WorkbookDetail
                                    category={selectedCategory}
                                    assignments={assignments.filter(a => (a.category || '기타') === selectedCategory)}
                                    onBack={() => setSelectedCategory(null)}
                                />
                            ) : (
                                <WorkbookList
                                    assignments={assignments}
                                    onSelectCategory={setSelectedCategory}
                                />
                            )
                        ) : filter === 'guide' ? (
                            <SystemGuide />
                        ) : (
                            <div className={`grid gap-8 ${selectedClassId ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'}`}>
                                {/* 메인 과제 목록 */}
                                <div className="lg:col-span-2 space-y-6">
                                    {/* Header */}
                                    <div className="flex items-center gap-3 mb-6">
                                        <span className="w-1.5 h-8 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full shadow-lg shadow-blue-500/40"></span>
                                        <h3 className="font-bold text-slate-800 text-xl tracking-tight">
                                            {selectedClassId ? `${myClasses.find(c => c.id === selectedClassId)?.name || '학급'} 과제` : '전체 과제 목록'}
                                            <span className="text-sm font-normal text-slate-400 ml-2">
                                                ({filteredAssignments.filter(a => !selectedClassId || (a.classIds || []).includes(selectedClassId) || a.classId === selectedClassId).length})
                                            </span>
                                        </h3>
                                    </div>

                                    <div className="space-y-6">
                                        {filteredAssignments
                                            .filter(a => !selectedClassId || (a.classIds || []).includes(selectedClassId) || a.classId === selectedClassId)
                                            .map((assignment, index) => {
                                                const isVoca = assignment.type === 'vocabulary';
                                                const showStatusBadge = !isVoca || assignment.status === 'completed';

                                                return (
                                                    <React.Fragment key={assignment.id}>
                                                    <div
                                                        style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'both' }}
                                                        className={`relative rounded-xl border transition-all duration-300 overflow-hidden group hover-lift animate-premium-fade-in-up opacity-0 backdrop-blur-md
                                        ${assignment.status === 'completed'
                                                                ? 'bg-white/60 border-slate-200/60'
                                                                : 'bg-white/80 border-slate-200/60 hover:border-blue-300 hover:bg-white'
                                                            }`}>

                                                        {/* Status Bar - Hide for Voca unless completed */}
                                                        <div className={`absolute left-0 top-0 bottom-0 w-1 transition-colors duration-300
                                            ${assignment.status === 'completed' ? 'bg-emerald-400/50' : (isVoca || assignment.type === 'workbook' || assignment.type === 'analysis' ? 'bg-slate-200' : 'bg-gradient-to-b from-blue-500 to-indigo-600')}`}></div>

                                                        <div className="flex items-center justify-between py-2.5 px-4 pl-6 gap-4">
                                                            {/* Left: Info */}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    {isVoca ? (
                                                                        <span className="flex-shrink-0 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                                                                            단어
                                                                        </span>
                                                                    ) : assignment.type === 'selection' ? (
                                                                        <span className="flex-shrink-0 px-2 py-0.5 rounded-md bg-yellow-100 text-yellow-700 text-[10px] font-bold border border-yellow-200">
                                                                            단어선택
                                                                        </span>
                                                                    ) : assignment.type === 'workbook' ? (
                                                                        <span className="flex-shrink-0 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200">
                                                                            워크북
                                                                        </span>
                                                                    ) : assignment.type === 'analysis' ? (
                                                                        <span className="flex-shrink-0 px-2 py-0.5 rounded-md bg-lime-100 text-lime-700 text-[10px] font-bold border border-lime-200">
                                                                            본문분석
                                                                        </span>
                                                                    ) : assignment.type === 'transform' ? (
                                                                        <span className="flex-shrink-0 px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[10px] font-bold border border-amber-200">
                                                                            변형문제
                                                                        </span>
                                                                    ) : assignment.type === 'writing' ? (
                                                                        <span className="flex-shrink-0 px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[10px] font-bold border border-rose-200">
                                                                            서술형
                                                                        </span>
                                                                    ) : (
                                                                        <span className="flex-shrink-0 px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[10px] font-bold border border-blue-200">
                                                                            구조독해
                                                                        </span>
                                                                    )}

                                                                    {showStatusBadge ? (
                                                                        <div className="flex items-center gap-2">
                                                                            <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border
                                                                                ${assignment.status === 'completed'
                                                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                                                    : 'bg-blue-50 text-blue-700 border-blue-100'
                                                                                }`}>
                                                                                {assignment.status === 'completed' ? 'COMPLETED' : 'IN PROGRESS'}
                                                                            </span>

                                                                            {/* Workbook Tiered Rewards Visuals */}
                                                                            {assignment.type === 'workbook' && assignment.status === 'completed' && (
                                                                                <>
                                                                                    {assignment.masteryLevel === 1 && (
                                                                                        <span className="flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                                                                                            <span>⭐</span> Silver
                                                                                        </span>
                                                                                    )}
                                                                                    {assignment.masteryLevel === 2 && (
                                                                                        <span className="flex items-center gap-1 text-[10px] font-bold bg-yellow-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-100 shadow-sm animate-pulse">
                                                                                            <span>👑</span> Gold Crown
                                                                                        </span>
                                                                                    )}
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border bg-slate-50 text-slate-500 border-slate-100">
                                                                            ONGOING
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <h4 className="text-[15px] font-bold text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors truncate">
                                                                    {assignment.title}
                                                                </h4>

                                                                <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 font-medium">
                                                                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                                    <span>
                                                                        {assignment.type === 'selection' && (assignment as any).selectedWordCount
                                                                            ? `${(assignment as any).selectionStatus === 'pending_review' ? '제출 완료' : '선택'}: ${(assignment as any).selectedWordCount} / 단어: ${assignment.words?.length || 0}`
                                                                            : assignment.type === 'vocabulary'
                                                                                ? `단어: ${assignment.words?.length || 0}`
                                                                                : `문장: ${assignment.sentences?.length || 0}`
                                                                        }
                                                                    </span >
                                                                </div >
                                                            </div >

                                                            {/* Right: Actions */}
                                                            <Link
                                                                href={`/student/assignment/${assignment.id}`}
                                                                className={`flex items-center justify-center px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap
                                                            ${assignment.status === 'completed'
                                                                        ? 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 shadow-sm'
                                                                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-sm hover:shadow-md'
                                                                    }`}
                                                            >
                                                                {
                                                                    assignment.status === 'completed'
                                                                        ? '결과 확인'
                                                                        : '학습 시작'
                                                                }
                                                            </Link >

                                                            <button
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    setHistoryTarget({ id: assignment.id, title: assignment.title, type: assignment.type });
                                                                }}
                                                                className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 shadow-sm rounded-lg text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-md transition-all"
                                                                title="학습 이력"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                                            </button>

                                                            {
                                                                assignment.status === 'completed' && (
                                                                    <Link
                                                                        href={`/student/assignment/${assignment.id}?mode=practice`}
                                                                        className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 shadow-sm rounded-lg text-slate-400 hover:text-emerald-600 hover:border-emerald-200 hover:shadow-md transition-all"
                                                                        title="복습하기"
                                                                    >
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                                                                    </Link>
                                                                )
                                                            }
                                                        </div>
                                                    </div>

                                                    {/* Child (Split) Assignments - Toggleable */}
                                                    {(assignment as any).childAssignments?.length > 0 && (
                                                        <div className="mt-2">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    setExpandedSelections(prev => {
                                                                        const next = new Set(prev);
                                                                        if (next.has(assignment.id)) next.delete(assignment.id);
                                                                        else next.add(assignment.id);
                                                                        return next;
                                                                    });
                                                                }}
                                                                className="flex items-center gap-2 w-full px-4 py-2 bg-amber-50/80 hover:bg-amber-100/80 border border-amber-200/50 rounded-xl transition-all text-left group/toggle"
                                                            >
                                                                <svg className={`w-3.5 h-3.5 text-amber-500 transition-transform ${expandedSelections.has(assignment.id) ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg>
                                                                <span className="text-[11px] font-bold text-amber-700">
                                                                    분할 단어 과제 ({(assignment as any).childAssignments.filter((c: any) => c.status === 'completed').length}/{(assignment as any).childAssignments.length}완료)
                                                                </span>
                                                                {(assignment as any).childAssignments.every((c: any) => c.status === 'completed') && (
                                                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 ml-auto">✅ 전체 완료</span>
                                                                )}
                                                            </button>
                                                            {expandedSelections.has(assignment.id) && (
                                                                <div className="ml-4 mt-2 space-y-2 border-l-2 border-amber-200 pl-4 animate-in slide-in-from-top-2 duration-200">
                                                                    {[...(assignment as any).childAssignments].sort((a: any, b: any) => (a.order ?? 999) - (b.order ?? 999) || (a.title || '').localeCompare(b.title || '')).map((child: any) => (
                                                                        <div key={child.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                                                                            child.status === 'completed'
                                                                                ? 'bg-emerald-50/50 border-emerald-200/60'
                                                                                : 'bg-white border-slate-100 hover:border-amber-200'
                                                                        }`}>
                                                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                                <span className="flex-shrink-0 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                                                                                    단어
                                                                                </span>
                                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                                                                    child.status === 'completed'
                                                                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                                                        : 'bg-blue-50 text-blue-600 border-blue-100'
                                                                                }`}>
                                                                                    {child.status === 'completed' ? '완료' : '진행중'}
                                                                                </span>
                                                                                <span className="text-sm font-bold text-slate-700 truncate">{child.title}</span>
                                                                                <span className="text-[10px] text-slate-400 flex-shrink-0">{child.words?.length || 0}개</span>
                                                                            </div>
                                                                            <Link
                                                                                href={`/student/assignment/${child.id}`}
                                                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex-shrink-0 ${
                                                                                    child.status === 'completed'
                                                                                        ? 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                                                                                        : 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm'
                                                                                }`}
                                                                            >
                                                                                {child.status === 'completed' ? '결과' : '학습'}
                                                                            </Link>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    </React.Fragment>
                                                );
                                            })}

                                        {/* Empty State */}
                                        {
                                            filteredAssignments.length === 0 && (
                                                <div className="text-center py-24 rounded-2xl">
                                                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300">
                                                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                                    </div>
                                                    <h3 className="text-lg font-bold text-slate-500 mb-2">해당하는 과제가 없습니다</h3>
                                                    <p className="text-slate-400 text-sm">다른 필터를 선택해보세요.</p>
                                                </div>
                                            )
                                        }
                                    </div>
                                </div>

                                {/* Stats Side Column */}
                                < div className="space-y-6" >
                                    {/* Notices Card */}
                                    < div className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 border border-white/50 shadow-lg shadow-indigo-100/20 sticky top-10 z-0" >
                                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]"></span>
                                            공지사항
                                        </h3>
                                        {
                                            (!notices || notices.length === 0) ? (
                                                <p className="text-sm text-slate-400">등록된 공지사항이 없습니다.</p>
                                            ) : (
                                                <ul className="space-y-3">
                                                    {notices.map(notice => (
                                                        <li key={notice.id} className="pb-3 border-b border-slate-100/80 last:border-0 last:pb-0">
                                                            <div className="flex justify-between items-start mb-1">
                                                                <span className="text-xs font-bold text-slate-400">
                                                                    {new Date(notice.createdAt).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                            <h4 className="text-sm font-bold text-slate-700 hover:text-indigo-600 transition-colors cursor-pointer">
                                                                {notice.title}
                                                            </h4>
                                                            {notice.content && (
                                                                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                                                                    {notice.content}
                                                                </p>
                                                            )}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )
                                        }
                                    </div>

                                    {/* Stats Card */}
                                    < div className="bg-gradient-to-b from-white/90 to-white/70 backdrop-blur-xl rounded-2xl p-6 border border-white/50 shadow-lg shadow-indigo-100/20 sticky top-80" >
                                        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                                            학습 요약
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4 mb-6">
                                            <div className="p-4 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 rounded-2xl border border-blue-100/50 text-center">
                                                <div className="text-2xl font-bold text-blue-600 mb-1 drop-shadow-sm tabular-nums">{assignments.filter(a => a.status === 'completed').length}</div>
                                                <div className="text-xs font-bold text-blue-400 uppercase tracking-wide">Completed</div>
                                            </div>
                                            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 text-center">
                                                <div className="text-2xl font-bold text-slate-600 mb-1 tabular-nums">{assignments.length}</div>
                                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total</div>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100">
                                            <div className="flex justify-between items-end mb-2">
                                                <span className="text-xs font-bold text-slate-500 uppercase">Progress</span>
                                                <span className="text-xl font-bold text-slate-700 tabular-nums">
                                                    {assignments.length ? Math.round((assignments.filter(a => a.status === 'completed').length / assignments.length) * 100) : 0}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-slate-200/50 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(79,70,229,0.4)]"
                                                    style={{ width: assignments.length ? `${(assignments.filter(a => a.status === 'completed').length / assignments.length) * 100}%` : '0%' }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* History Modal */}
            {
                historyTarget && studentId && (
                    <ResultHistoryModal
                        assignmentId={historyTarget.id}
                        assignmentTitle={historyTarget.title}
                        studentId={studentId}
                        assignmentType={historyTarget.type}
                        onClose={() => setHistoryTarget(null)}
                        onViewDetail={(sub) => {
                            setHistoryTarget(null);
                            router.push(`/student/assignment/${sub.assignmentId}?viewAttempt=${sub.attempt}`);
                        }}
                    />
                )
            }

            {/* Structure Print Modal */}
            {showPrintModal && studentId && (
                <StructurePrintModal
                    studentId={studentId}
                    studentName={studentName}
                    assignments={assignments}
                    onClose={() => setShowPrintModal(false)}
                />
            )}

            {/* Password Modal ... (Kept same) */}
            {
                showPasswordModal && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl border border-slate-100">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">비밀번호 변경</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">현재 비밀번호</label>
                                    <input
                                        type="password"
                                        value={passwordForm.current}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1E40AF]/20 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">새 비밀번호</label>
                                    <input
                                        type="password"
                                        value={passwordForm.new}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1E40AF]/20 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">새 비밀번호 확인</label>
                                    <input
                                        type="password"
                                        value={passwordForm.confirm}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1E40AF]/20 outline-none"
                                    />
                                </div>
                            </div>
                            <div className="flex space-x-3 mt-6">
                                <button
                                    onClick={() => setShowPasswordModal(false)}
                                    className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-2.5 rounded-lg transition-all font-medium"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handlePasswordChange}
                                    className="flex-1 bg-[#1E40AF] hover:bg-[#151b3f] text-white py-2.5 rounded-lg transition-all shadow-md font-medium"
                                >
                                    변경하기
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
}
