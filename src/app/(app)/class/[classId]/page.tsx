'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import AssignmentEditor from '@/components/admin/AssignmentEditor';
import StructurePrintModal from '@/components/student/StructurePrintModal';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import StudentManageModal from './components/StudentManageModal';
import ResetAssignmentModal from './components/ResetAssignmentModal';
import ClassSettingsModal from './components/ClassSettingsModal';
import SplitAssignmentModal from './components/SplitAssignmentModal';
import SelectionApprovalModal from './components/SelectionApprovalModal';
import PrintModal from './components/PrintModal';
import WritingDetailModal from './components/WritingDetailModal';
import { AssignmentItem, SortableItem } from './components/AssignmentItem';
import { useClassRoom, AssignmentWithStats } from './useClassRoom';

// Dnd Kit
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

export default function ClassRoomPage() {
    const state = useClassRoom();
    const {
        router, classId, user, isAdmin,
        classData, assignments, setAssignments, allClasses, allStudents, allSubmissions, allAssignmentsRaw, expandedSelections, setExpandedSelections,
        loading,
        isEditorOpen, setIsEditorOpen, isStudentModalOpen, setIsStudentModalOpen,
        isAddingStudent, setIsAddingStudent,
        editingAssignment, setEditingAssignment,
        isSettingsModalOpen, setIsSettingsModalOpen, editingClassName, setEditingClassName,
        isResetModalOpen, setIsResetModalOpen, resetTargetAssignment, resetSelectedStudents,
        sortMode, sortDirection, isReordering, setIsReordering, originalOrder, setOriginalOrder,
        selectedAssignments, setSelectedAssignments,
        isSplitModalOpen, setIsSplitModalOpen, splitTarget, setSplitTarget, splitOptions, setSplitOptions,
        isPrintModalOpen, setIsPrintModalOpen, printTitle, setPrintTitle, printStudentId, setPrintStudentId,
        isStructurePrintOpen, setIsStructurePrintOpen, structurePrintStudentId, setStructurePrintStudentId, structurePrintStudentName, setStructurePrintStudentName,
        writingDetailTarget, setWritingDetailTarget,
        approvalModal, setApprovalModal, splitWordsPerChunk, setSplitWordsPerChunk,
        searchTerm, setSearchTerm, selectedStudentIds, setSelectedStudentIds,
        moveAssignmentModal, setMoveAssignmentModal,
        sensors,
        toggleAssignmentSelection, handleMergeAssignments, handleSplitAssignment,
        loadData, handleCreateClick, handleEditClick, handleDeleteClick, handleResetClick,
        handleExecuteReset, toggleResetStudentSelection, handleAddSelectedStudents, toggleStudentSelection,
        handleSortChange, handleDragEnd, handleSaveOrder, handleToggleReorder,
        handleUpdateClass, handleDeleteClass, handleMoveAssignment,
        handleApproveSubmission, handleApproveWithSplit, handleRejectSubmission, handleConvertAssignmentType,
        handleToggleGuidance, handleManualPass, handlePrint, handleDirectPrint,
    } = state;

    // ── Scroll restoration: scroll to last-edited assignment ──
    useEffect(() => {
        if (loading || isEditorOpen) return;
        const targetId = sessionStorage.getItem('scrollToAssignment');
        if (targetId) {
            sessionStorage.removeItem('scrollToAssignment');
            requestAnimationFrame(() => {
                const el = document.querySelector(`[data-assignment-id="${targetId}"]`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('ring-2', 'ring-blue-400', 'ring-offset-2');
                    setTimeout(() => el.classList.remove('ring-2', 'ring-blue-400', 'ring-offset-2'), 2000);
                }
            });
        }
    }, [loading, isEditorOpen, assignments]);


    if (!classData && !loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-10 relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none select-none">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo.jpg" alt="Background" className="w-[500px] h-[500px] object-cover rounded-full grayscale blur-sm" />
                </div>
                <div className="relative z-10 text-center animate-in fade-in zoom-in duration-500">
                    <div className="w-24 h-24 mx-auto bg-white rounded-[2rem] shadow-xl border-4 border-slate-50 flex items-center justify-center mb-6">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo.jpg" alt="Cheonghan English" className="w-full h-full object-cover rounded-[1.7rem]" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">클래스를 선택해주세요</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">좌측 메뉴에서 클래스를 선택하세요.</p>
                </div>
            </div>
        );
    }

    // Calculate students for this class ONLY
    const currentClassStudents = allStudents.filter(s => (s.classIds || []).includes(classId));
    // Filter available students (excluding already in class)
    const availableStudents = allStudents
        .filter(s => !(s.classIds || []).includes(classId))
        .filter(s =>
            searchTerm === '' ||
            s.name.includes(searchTerm) ||
            s.id.includes(searchTerm)
        );

    if (isEditorOpen) {
        return (
            <div className="h-full bg-white animate-in slide-in-from-bottom-5 duration-300">
                <AssignmentEditor
                    initialClassId={classId}
                    classes={allClasses}
                    allStudents={allStudents}
                    initialData={editingAssignment}
                    onClose={() => {
                        const scrollTargetId = editingAssignment?.id;
                        setIsEditorOpen(false);
                        setEditingAssignment(null);
                        // Scroll back to the edited assignment after DOM update
                        if (scrollTargetId) {
                            sessionStorage.setItem('scrollToAssignment', scrollTargetId);
                        }
                    }}
                    onSave={() => {
                        const scrollTargetId = editingAssignment?.id;
                        setIsEditorOpen(false);
                        setEditingAssignment(null);
                        loadData();
                        if (scrollTargetId) {
                            sessionStorage.setItem('scrollToAssignment', scrollTargetId);
                        }
                    }}
                />
            </div>
        );
    }


    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 min-h-full">
            {/* Hero Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-12"
            >
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Assignment Room</span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0A0E27] dark:text-white tracking-tight leading-none flex items-center gap-3">
                            {classData?.name || (loading ? '불러오는 중...' : '클래스 없음')}
                            {isAdmin && classData && (
                                <button
                                    onClick={() => {
                                        setEditingClassName(classData?.name || '');
                                        setIsSettingsModalOpen(true);
                                    }}
                                    className="opacity-20 hover:opacity-100 transition-opacity p-2 text-slate-400 hover:text-blue-600"
                                    title="클래스 설정"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                </button>
                            )}
                        </h1>
                        <p className="mt-3 text-lg font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                            {isAdmin ? '관리자 모드' : '학생 모드'}
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span>{loading ? 0 : assignments.length} Assignments</span>
                        </p>
                    </div>

                    {/* Admin Actions */}
                    <div className="flex items-center gap-3">
                        {isAdmin && (
                            <>
                                <button
                                    onClick={() => setIsStudentModalOpen(true)}
                                    className="px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                                    <span className="hidden sm:inline">학생 관리</span>
                                </button>

                                {selectedAssignments.size >= 2 && (() => {
                                    const selTypes = assignments.filter(a => selectedAssignments.has(a.id)).map(a => a.type);
                                    const allVocab = selTypes.every(t => t === 'vocabulary' || t === 'selection');
                                    return allVocab ? (
                                        <button
                                            onClick={handleMergeAssignments}
                                            className="px-5 py-3 bg-blue-100 text-blue-700 font-bold rounded-2xl hover:bg-blue-200 transition-all shadow-sm flex items-center gap-2 mr-1"
                                        >
                                            합치기 ({selectedAssignments.size})
                                        </button>
                                    ) : null;
                                })()}
                                {selectedAssignments.size >= 1 && (() => {
                                    const hasTransform = assignments.some(a => selectedAssignments.has(a.id) && a.type === 'transform');
                                    return hasTransform ? (
                                        <button
                                            onClick={handleDirectPrint}
                                            className="px-5 py-3 bg-blue-100 text-blue-700 font-bold rounded-2xl hover:bg-blue-200 transition-all shadow-sm flex items-center gap-2 mr-1"
                                        >
                                            🖨️ 인쇄 ({selectedAssignments.size})
                                        </button>
                                    ) : null;
                                })()}
                                {selectedAssignments.size >= 1 && (() => {
                                    const hasStructure = assignments.some(a => selectedAssignments.has(a.id) && a.type === 'structure');
                                    if (!hasStructure) return null;
                                    return (
                                        <button
                                            onClick={() => {
                                                setStructurePrintStudentId('');
                                                setStructurePrintStudentName('');
                                                setIsStructurePrintOpen(true);
                                            }}
                                            className="px-5 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-sm hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2 mr-1"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                                            구조독해 인쇄
                                        </button>
                                    );
                                })()}
                                {selectedAssignments.size >= 1 && (() => {
                                    const analysisIds = assignments.filter(a => selectedAssignments.has(a.id) && a.type === 'analysis').map(a => a.id);
                                    if (analysisIds.length === 0) return null;
                                    return (
                                        <button
                                            onClick={() => {
                                                // Open each analysis print page in new tabs
                                                const idsParam = analysisIds.join(',');
                                                window.open(`/analysis-batch-print?ids=${encodeURIComponent(idsParam)}&mode=passage`, '_blank');
                                            }}
                                            className="px-5 py-3 bg-blue-100 text-blue-700 font-bold rounded-2xl hover:bg-blue-200 transition-all shadow-sm flex items-center gap-2 mr-1"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                                            본문분석 인쇄 ({analysisIds.length})
                                        </button>
                                    );
                                })()}
                                {selectedAssignments.size >= 1 && (() => {
                                    const structureIds = assignments.filter(a => selectedAssignments.has(a.id) && a.type === 'structure').map(a => a.id);
                                    if (structureIds.length === 0) return null;
                                    return (
                                        <div className="relative">
                                            <button
                                                onClick={() => {
                                                    const el = document.getElementById('worksheet-print-dropdown');
                                                    if (el) el.classList.toggle('hidden');
                                                }}
                                                className="px-5 py-3 bg-teal-100 text-teal-700 font-bold rounded-2xl hover:bg-teal-200 transition-all shadow-sm flex items-center gap-2 mr-1"
                                            >
                                                📝 학습지 인쇄 ({structureIds.length})
                                            </button>
                                            <div id="worksheet-print-dropdown" className="hidden absolute right-0 top-full mt-2 z-50 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 w-[260px]">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">인쇄 옵션</div>
                                                <label className="flex items-center gap-2 cursor-pointer select-none mb-3 p-2 rounded-lg hover:bg-slate-50">
                                                    <input
                                                        type="checkbox"
                                                        id="worksheet-include-translation"
                                                        defaultChecked={true}
                                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <div>
                                                        <span className="text-sm font-bold text-slate-700">AI 해석 포함</span>
                                                        <p className="text-[10px] text-slate-400">각 문장 아래에 한국어 번역 표시</p>
                                                    </div>
                                                </label>
                                                <div className="text-[11px] text-slate-400 mb-3 px-2">
                                                    구조독해 {structureIds.length}개 과제가 인쇄됩니다
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            const includeTranslation = (document.getElementById('worksheet-include-translation') as HTMLInputElement)?.checked ?? true;
                                                            const url = `/worksheet-print?ids=${encodeURIComponent(structureIds.join(','))}&translation=${includeTranslation}`;
                                                            window.open(url, '_blank');
                                                            document.getElementById('worksheet-print-dropdown')?.classList.add('hidden');
                                                        }}
                                                        className="flex-1 py-2 bg-[#0A0E27] text-white font-bold rounded-lg text-xs hover:bg-[#1a1f3d] transition-all flex items-center justify-center gap-1"
                                                    >
                                                        인쇄하기
                                                    </button>
                                                    <button
                                                        onClick={() => document.getElementById('worksheet-print-dropdown')?.classList.add('hidden')}
                                                        className="py-2 px-3 bg-slate-100 text-slate-500 font-bold rounded-lg text-xs hover:bg-slate-200 transition-all"
                                                    >
                                                        취소
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                                {selectedAssignments.size >= 1 && (() => {
                                    const wbList = assignments.filter(a => selectedAssignments.has(a.id) && a.type === 'workbook');
                                    if (wbList.length === 0) return null;
                                    return (
                                        <button
                                            onClick={() => {
                                                const pw = window.open('', '_blank');
                                                if (!pw) return;
                                                const ll: Record<string, string> = { vocab: '1단계: 어휘', grammar: '2단계: 어법', mastery: '3단계: 구문 완성' };
                                                let h = '';
                                                wbList.forEach((a: any, ai: number) => {
                                                    const cfg = a.workbookConfig;
                                                    if (!cfg) return;
                                                    if (ai > 0) h += '<div style="page-break-before:always;height:1px"></div>';
                                                    h += '<div style="margin-bottom:40px"><div style="border-bottom:3px solid #0A0E27;padding-bottom:12px;margin-bottom:20px"><h1 style="font-size:18px;font-weight:900;margin:0">' + a.title + '</h1><span style="font-size:10px;color:#86868b">워크북</span></div>';
                                                    h += '<div style="background:#f5f5f7;border-radius:12px;padding:16px 20px;margin-bottom:24px;font-size:13px;line-height:1.8">' + (cfg.passage || '').split('\n').filter((p: string) => p.trim()).map((p: string) => '<p style="margin:0 0 4px">' + p + '</p>').join('') + '</div>';
                                                    (cfg.levels || []).forEach((lv: any, li: number) => {
                                                        h += '<div style="margin-bottom:20px"><h3 style="font-size:14px;font-weight:900;border-bottom:2px solid #e5e5ea;padding-bottom:6px;margin:0 0 12px">' + (ll[lv.type] || ((li+1)+'단계')) + '</h3>';
                                                        (lv.problems || []).forEach((pr: any, pi: number) => {
                                                            const lb = String.fromCharCode(65+pi);
                                                            const st = lv.type === 'mastery' ? pr.style : lv.type;
                                                            const ns = 'width:24px;height:24px;border-radius:6px;background:#f5f5f7;display:inline-flex;align-items:center;justify-content:center;font-weight:900;font-size:11px;color:#6e6e73;flex-shrink:0;margin-right:8px';
                                                            if (st === 'vocab' || st === 'grammar') {
                                                                h += '<div style="display:flex;gap:10px;margin-bottom:14px"><div style="' + ns + '">' + lb + '</div><div><p style="font-size:13px;font-weight:600;margin:0 0 6px">' + pr.question + '</p><div style="display:flex;flex-wrap:wrap;gap:8px">' + (pr.choices||[]).map((c: string, i: number) => '<span style="font-size:12px;padding:2px 8px;border:1px solid #e5e5ea;border-radius:6px">' + (i+1) + '. ' + c + '</span>').join('') + '</div></div></div>';
                                                            } else if (st === 'unscramble') {
                                                                const segs = [...(pr.segments||pr.answer?.split(' ')||[])].sort(() => Math.random()-0.5);
                                                                h += '<div style="display:flex;gap:10px;margin-bottom:14px"><div style="' + ns + '">' + lb + '</div><div><p style="font-size:13px;font-weight:700;margin:0 0 8px">' + (pr.korean||'') + '</p><div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">' + segs.map((w: string) => '<span style="font-size:11px;padding:2px 8px;background:#f5f5f7;border:1px solid #e5e5ea;border-radius:4px;font-weight:600">' + w + '</span>').join('') + '</div><div style="border-bottom:1.5px solid #c7c7cc;height:28px"></div></div></div>';
                                                            } else if (st === 'writing') {
                                                                const sk = (pr.skeleton||'').replace(/\[.*?\]/g, '<span style="display:inline-block;border-bottom:1.5px solid #1d1d1f;width:60px;text-align:center;margin:0 2px">____</span>');
                                                                h += '<div style="display:flex;gap:10px;margin-bottom:14px"><div style="' + ns + '">' + lb + '</div><div><p style="font-size:13px;font-weight:700;margin:0 0 8px">' + (pr.korean||'') + '</p><div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">' + (pr.hints||[]).map((ht: string) => '<span style="font-size:11px;padding:2px 8px;background:#f5f5f7;border:1px solid #e5e5ea;border-radius:4px;font-weight:600">' + ht + '</span>').join('') + '</div><p style="font-size:13px;line-height:2;margin:0">' + sk + '</p></div></div>';
                                                            }
                                                        });
                                                        h += '</div>';
                                                    });
                                                    h += '</div>';
                                                });

                                                // ★ Answer Key for Levels 1 & 2
                                                h += '<div style="page-break-before:always;height:1px"></div>';
                                                h += '<div style="margin-bottom:40px"><div style="border-bottom:3px solid #0A0E27;padding-bottom:12px;margin-bottom:20px"><h1 style="font-size:18px;font-weight:900;margin:0">📋 정답지 (1·2단계)</h1></div>';
                                                wbList.forEach((ak: any) => {
                                                    const akCfg = ak.workbookConfig;
                                                    if (!akCfg) return;
                                                    h += '<div style="margin-bottom:16px"><h3 style="font-size:13px;font-weight:800;margin:0 0 6px;color:#1d1d1f">' + ak.title + '</h3>';
                                                    (akCfg.levels || []).forEach((akLv: any) => {
                                                        if (akLv.type !== 'vocab' && akLv.type !== 'grammar') return;
                                                        const akLn = akLv.type === 'vocab' ? '1단계 어휘' : '2단계 어법';
                                                        h += '<div style="margin-bottom:8px"><span style="font-size:11px;font-weight:700;color:#6e6e73">' + akLn + ': </span>';
                                                        h += (akLv.problems || []).map((akPr: any, akPi: number) => {
                                                            const akLb = String.fromCharCode(65 + akPi);
                                                            const akCi = (akPr.choices || []).indexOf(akPr.answer);
                                                            return '<span style="font-size:12px;font-weight:600;margin-right:12px">' + akLb + '. ' + (akCi >= 0 ? (akCi + 1) : akPr.answer) + '</span>';
                                                        }).join('');
                                                        h += '</div>';
                                                    });
                                                    h += '</div>';
                                                });
                                                h += '</div>';
                                                pw.document.write('<!DOCTYPE html><html><head><title>워크북 인쇄</title><style>@page{margin:15mm}*{margin:0;padding:0;box-sizing:border-box}body{font-family:Pretendard,Apple SD Gothic Neo,Malgun Gothic,sans-serif;color:#1d1d1f;line-height:1.6}</style></head><body>' + h + '</body></html>');
                                                pw.document.close();
                                                setTimeout(() => pw.print(), 300);
                                            }}
                                            className="px-5 py-3 bg-blue-100 text-blue-700 font-bold rounded-2xl hover:bg-blue-200 transition-all shadow-sm flex items-center gap-2 mr-1"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                                            워크북 인쇄 ({wbList.length})
                                        </button>
                                    );
                                })()}
                                <button
                                    onClick={() => router.push(`/admin/assignment/new?classId=${classId}`)}
                                    className="px-6 py-3 bg-[#0A0E27] text-white font-bold rounded-2xl hover:bg-blue-800 transition-all shadow-xl shadow-blue-900/20 flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
                                >
                                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                                    새 과제
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Sort Controls & Select All */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    {/* Select All Checkbox */}
                    {isAdmin && (
                        <label className="flex items-center gap-2 cursor-pointer select-none" onClick={e => e.stopPropagation()}>
                            <input
                                type="checkbox"
                                checked={assignments.length > 0 && selectedAssignments.size === assignments.filter(a => a.type === 'vocabulary' || a.type === 'selection' || a.type === 'transform' || a.type === 'structure' || a.type === 'workbook' || a.type === 'analysis').length}
                                onChange={() => {
                                    const checkable = assignments.filter(a => a.type === 'vocabulary' || a.type === 'selection' || a.type === 'transform' || a.type === 'structure' || a.type === 'workbook' || a.type === 'analysis');
                                    if (selectedAssignments.size === checkable.length) {
                                        setSelectedAssignments(new Set());
                                    } else {
                                        setSelectedAssignments(new Set(checkable.map(a => a.id)));
                                    }
                                }}
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <span className="text-xs font-bold text-slate-400">전체</span>
                        </label>
                    )}

                    {/* Sort Buttons */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                        <button
                            onClick={() => handleSortChange('date')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${
                                sortMode === 'date' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            최신순
                            {sortMode === 'date' && (
                                <span className="text-[10px] text-blue-500">{sortDirection === 'desc' ? '↓' : '↑'}</span>
                            )}
                        </button>
                        <button
                            onClick={() => handleSortChange('name')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${
                                sortMode === 'name' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            이름순
                            {sortMode === 'name' && (
                                <span className="text-[10px] text-blue-500">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                        </button>
                        {isAdmin && (
                            <button
                                onClick={() => handleSortChange('custom')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                                    sortMode === 'custom' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                직접 설정
                            </button>
                        )}
                    </div>
                </div>

                {isAdmin && sortMode === 'custom' && (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
                        {!isReordering ? (
                            <button
                                onClick={() => {
                                    setOriginalOrder(assignments.map(a => a.id));
                                    setIsReordering(true);
                                }}
                                className="px-4 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                            >
                                순서 변경
                            </button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-orange-500 font-bold animate-pulse">드래그하여 순서 변경</span>
                                <button
                                    onClick={() => {
                                        // Revert to original order
                                        if (originalOrder.length > 0) {
                                            const reverted = originalOrder.map(id => assignments.find(a => a.id === id)).filter(Boolean) as AssignmentWithStats[];
                                            setAssignments(reverted);
                                        }
                                        setIsReordering(false);
                                    }}
                                    className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg"
                                >
                                    취소
                                </button>
                                <button onClick={handleSaveOrder} className="px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700">
                                    저장
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Assignment List */}
            <div className="space-y-4">
                {loading ? (
                    <LoadingSpinner variant="skeleton" />
                ) : assignments.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50/50 dark:bg-slate-800/50">
                        <p className="font-bold text-lg mb-1">등록된 과제가 없습니다.</p>
                        {isAdmin ? (
                            <p className="text-sm">새 과제 버튼을 눌러 과제를 만들어보세요.</p>
                        ) : (
                            <p className="text-sm">곧 새로운 과제가 등록될 예정입니다.</p>
                        )}
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={assignments.map(a => a.id)}
                            strategy={verticalListSortingStrategy}
                            disabled={!isReordering}
                        >
                            {assignments.map(ass => (
                                <div key={ass.id} data-assignment-id={ass.id} className={`rounded-2xl transition-all duration-500 ${isReordering ? 'touch-none' : ''}`}>
                                    <SortableItem id={ass.id} disabled={!isReordering}>
                                        <AssignmentItem
                                            assignment={ass}
                                            userRole={(user as any)?.role}
                                            onDelete={handleDeleteClick}
                                            onReset={handleResetClick}
                                            classStudents={currentClassStudents}
                                            submissions={allSubmissions}
                                            router={router}
                                            currentUserId={(user as any)?.id}
                                            onToggleGuidance={handleToggleGuidance}
                                            onApproveSubmission={handleApproveSubmission}
                                            onPrint={handlePrint}
                                            isReordering={isReordering}
                                            onManualPass={handleManualPass}
                                            allAssignmentsRaw={allAssignmentsRaw}
                                            expandedSelections={expandedSelections}
                                            setExpandedSelections={setExpandedSelections}
                                            selectedAssignments={selectedAssignments}
                                            toggleAssignmentSelection={toggleAssignmentSelection}
                                            onEdit={handleEditClick}
                                            setApprovalModal={setApprovalModal}
                                            setWritingDetailTarget={setWritingDetailTarget}
                                            setSplitTarget={setSplitTarget}
                                            setIsSplitModalOpen={setIsSplitModalOpen}
                                            setStructurePrintStudentId={setStructurePrintStudentId}
                                            setStructurePrintStudentName={setStructurePrintStudentName}
                                            setIsStructurePrintOpen={setIsStructurePrintOpen}
                                            classId={classId}
                                            onConvertType={handleConvertAssignmentType}
                                            setMoveAssignmentModal={setMoveAssignmentModal}
                                        />
                                    </SortableItem>
                                </div>
                            ))}
                        </SortableContext>
                    </DndContext>
                )}
            </div>

            {/* Student List Modal */}
            <StudentManageModal
                isOpen={isStudentModalOpen}
                onClose={() => setIsStudentModalOpen(false)}
                currentClassStudents={currentClassStudents}
                availableStudents={availableStudents}
                isAddingStudent={isAddingStudent}
                setIsAddingStudent={setIsAddingStudent}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                selectedStudentIds={selectedStudentIds}
                toggleStudentSelection={toggleStudentSelection}
                handleAddSelectedStudents={handleAddSelectedStudents}
                setSelectedStudentIds={setSelectedStudentIds}
            />

            {/* Reset Modal */}
            <ResetAssignmentModal
                isOpen={isResetModalOpen}
                onClose={() => setIsResetModalOpen(false)}
                resetTargetAssignment={resetTargetAssignment}
                currentClassStudents={currentClassStudents}
                allSubmissions={allSubmissions}
                resetSelectedStudents={resetSelectedStudents}
                toggleResetStudentSelection={toggleResetStudentSelection}
                handleExecuteReset={handleExecuteReset}
            />

            {/* Class Settings Modal */}
            <ClassSettingsModal
                isOpen={isSettingsModalOpen}
                onClose={() => setIsSettingsModalOpen(false)}
                editingClassName={editingClassName}
                setEditingClassName={setEditingClassName}
                handleUpdateClass={handleUpdateClass}
                handleDeleteClass={handleDeleteClass}
            />
            {/* Split Assignment Modal */}
            <SplitAssignmentModal
                isOpen={isSplitModalOpen}
                onClose={() => { setIsSplitModalOpen(false); setSplitTarget(null); }}
                splitTarget={splitTarget}
                splitOptions={splitOptions}
                setSplitOptions={setSplitOptions}
                handleSplitAssignment={handleSplitAssignment}
            />

            {/* Print Modal */}
            <PrintModal
                isOpen={isPrintModalOpen}
                onClose={() => setIsPrintModalOpen(false)}
                assignments={assignments}
                selectedAssignments={selectedAssignments}
                allSubmissions={allSubmissions}
                currentClassStudents={currentClassStudents}
                printTitle={printTitle}
                setPrintTitle={setPrintTitle}
                printStudentId={printStudentId}
                setPrintStudentId={setPrintStudentId}
            />


            {/* Structure Print Modal */}
            {isStructurePrintOpen && (
                <StructurePrintModal
                    studentId={structurePrintStudentId}
                    studentName={structurePrintStudentName}
                    assignments={assignments}
                    onClose={() => setIsStructurePrintOpen(false)}
                    isAdmin={true}
                />
            )}

            {/* Writing Detail Modal */}
            <WritingDetailModal
                writingDetailTarget={writingDetailTarget}
                onClose={() => setWritingDetailTarget(null)}
            />
            {/* Selection Approval Modal */}
            <SelectionApprovalModal
                approvalModal={approvalModal}
                onClose={() => setApprovalModal(null)}
                splitWordsPerChunk={splitWordsPerChunk}
                setSplitWordsPerChunk={setSplitWordsPerChunk}
                handleApproveSubmission={handleApproveSubmission}
                handleApproveWithSplit={handleApproveWithSplit}
                handleRejectSubmission={handleRejectSubmission}
            />

            {/* Move Assignment Modal */}
            {moveAssignmentModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-slate-800 mb-1">과제 이동</h3>
                        <p className="text-sm text-slate-500 mb-4">
                            <span className="font-bold text-blue-600">{moveAssignmentModal.title}</span>을(를) 다른 과제방으로 이동합니다.
                        </p>
                        <p className="text-[11px] text-slate-400 mb-3">※ 학생/제출 기록은 이동되지 않습니다.</p>

                        <div className="space-y-1 max-h-60 overflow-y-auto mb-4 border border-slate-100 rounded-xl p-2">
                            {allClasses
                                .filter(c => c.id !== classId)
                                .map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => handleMoveAssignment(moveAssignmentModal.assignmentId, c.id)}
                                        className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-blue-50 text-sm font-medium text-slate-600 transition-colors flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                        <span className="truncate">{c.name}</span>
                                    </button>
                                ))}
                            {allClasses.filter(c => c.id !== classId).length === 0 && (
                                <p className="text-sm text-slate-400 text-center py-4">이동 가능한 과제방이 없습니다.</p>
                            )}
                        </div>

                        <button
                            onClick={() => setMoveAssignmentModal(null)}
                            className="w-full py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                        >
                            취소
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
