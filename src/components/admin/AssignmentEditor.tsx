'use client';

import React, { useState, useEffect } from 'react';
import { dbService } from '@/services/db';
import { Class, Assignment } from '@/types';
import AssignmentImportModal from './AssignmentImportModal';
import TransformAssignmentForm from './TransformAssignmentForm';
import SubjectiveAssignmentForm from './SubjectiveAssignmentForm';
import ExternalSubjectiveForm from './ExternalSubjectiveForm';
import WorkbookAssignmentForm from './WorkbookAssignmentForm';
import WritingAssignmentForm from './WritingAssignmentForm';
import ListeningSetForm from './ListeningSetForm';
import StructureVocabForm from './StructureVocabForm';
import SentenceOrderForm from './SentenceOrderForm';
import MockExamForm from './MockExamForm';
import InaesinBatchForm from './InaesinBatchForm';
import { toast } from 'sonner';

interface AssignmentEditorProps {
    initialClassId?: string;
    classes: Class[];
    allStudents: any[];
    onClose: () => void;
    onSave: () => void;
    initialData?: Assignment | null;
}

type AssignmentType = 'structure' | 'vocabulary' | 'selection' | 'transform' | 'transform_subjective' | 'external_subjective' | 'writing' | 'workbook' | 'analysis' | 'listening_set' | 'sentence_order' | 'mock_exam' | 'inaesin_batch';

export default function AssignmentEditor({ initialClassId, classes, allStudents, onClose, onSave, initialData }: AssignmentEditorProps) {
    const [creationStep, setCreationStep] = useState<'type_select' | 'form'>('type_select');
    const [assignmentType, setAssignmentType] = useState<AssignmentType>('structure');
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [selectedClassIds, setSelectedClassIds] = useState<string[]>(initialClassId ? [initialClassId] : []);

    // Initialize from editing data
    useEffect(() => {
        if (initialData) {
            const type = (initialData.type || 'structure') as AssignmentType;
            setAssignmentType(type);
            setCreationStep('form');
            setSelectedClassIds(initialData.classIds || (initialData.classId ? [initialData.classId] : []));
        } else {
            setCreationStep('type_select');
            if (initialClassId) {
                setSelectedClassIds([initialClassId]);
            }
        }
    }, [initialData, initialClassId]);

    // Import Handler
    const handleImportSelect = (imported: Assignment) => {
        if (!confirm(`'${imported.title}' 과제의 내용을 불러오시겠습니까?`)) return;
        setAssignmentType((imported.type || 'structure') as AssignmentType);
        setCreationStep('form');
        setIsImportModalOpen(false);
    };

    // Helper: save handler for delegated forms
    const makeSaveHandler = (typeName: string) => async (assignmentData: any) => {
        try {
            if (initialData?.id) {
                await dbService.updateAssignment(initialData.id, {
                    ...assignmentData,
                    classIds: selectedClassIds
                } as any);
                toast.success(`✅ ${typeName} 과제가 성공적으로 수정되었습니다.`);
            } else {
                await dbService.addAssignment({
                    ...assignmentData,
                    status: 'assigned',
                });
                toast.success(`✅ ${typeName} 과제가 성공적으로 저장되었습니다.`);
            }
            onSave();
            onClose();
        } catch (error: any) {
            console.error(`Save ${typeName} Assignment Error:`, error);
            toast.error(`과제 저장 중 오류가 발생했습니다:\n${error.message || error}`);
        }
    };

    const handleBack = () => {
        if (initialData) onClose();
        else setCreationStep('type_select');
    };

    // ============================
    // VIEW: Type Selection Cards
    // ============================
    if (creationStep === 'type_select') {
        const TypeCard = ({ type, color, icon, title, desc, newBadge, onClick }: any) => (
            <div
                onClick={onClick ?? (() => { setAssignmentType(type); setCreationStep('form'); })}
                className={`group cursor-pointer bg-white border-2 border-slate-100 hover:border-${color}-500 rounded-2xl p-4 text-center transition-all hover:bg-${color}-50/30 hover:shadow-lg hover:-translate-y-0.5 relative overflow-hidden`}
            >
                <div className={`w-11 h-11 bg-${color}-100 rounded-xl mx-auto flex items-center justify-center mb-2.5 group-hover:bg-${color}-500 transition-colors shadow-inner`}>
                    {icon}
                </div>
                {newBadge && (
                    <div className={`absolute top-2.5 right-2.5 bg-${color}-100 text-${color}-700 text-[9px] px-1.5 py-0.5 rounded-full font-bold`}>New</div>
                )}
                <h3 className={`text-[13px] font-bold text-slate-800 mb-1 group-hover:text-${color}-600 leading-tight`}>{title}</h3>
                <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">{desc}</p>
            </div>
        );

        return (
            <div className="p-6 h-full overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-bold text-slate-800">새 과제 만들기</h2>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsImportModalOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm text-sm">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path></svg>
                            과제 불러오기
                        </button>
                        <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3 max-w-3xl mx-auto">
                    {/* Row 1: 단어학습 / 구조독해 / 구조작문 */}
                    <TypeCard type="vocabulary" color="green"
                        title="단어학습" desc="단어장·단어선택·플래시카드 학습"
                        icon={
                            <svg className="w-6 h-6" viewBox="0 0 32 32" fill="none">
                                <defs><clipPath id="diagClip"><rect width="32" height="32" /></clipPath></defs>
                                <g clipPath="url(#diagClip)">
                                    <polygon points="0,0 32,0 0,32" className="fill-green-500 group-hover:fill-white transition-colors" />
                                    <polygon points="32,0 32,32 0,32" className="fill-yellow-400 group-hover:fill-white/80 transition-colors" />
                                </g>
                                <path d="M16 6C12.686 6 10 8.686 10 12v1h12v-1c0-3.314-2.686-6-6-6z" className="fill-white/90" />
                                <rect x="9" y="14" width="14" height="12" rx="2" className="fill-white/90" />
                                <path d="M13 18h6M13 21h4" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                        } />
                    <TypeCard type="structure" color="blue"
                        title="구조독해" desc="문장 구조 분석 및 해석 학습"
                        icon={<svg className="w-6 h-6 text-blue-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>} />
                    <TypeCard type="writing" color="pink"
                        title="구조작문" desc="26가지 구문 AI 영작 실시간 채점"
                        icon={<span className="text-2xl">✍️</span>} />

                    {/* Row 2: 본문분석 / 세부순서 / 워크북 */}
                    <TypeCard type="analysis" color="sky"
                        title="본문분석" desc="AI 지문 문장별 심층 분석 배포"
                        icon={<svg className="w-6 h-6 text-sky-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>}
                        newBadge={true} />
                    <TypeCard type="sentence_order" color="amber"
                        title="세부순서" desc="드래그로 문장 순서 맞추기"
                        icon={<span className="text-2xl">🔀</span>}
                        newBadge={true} />
                    <TypeCard type="workbook" color="purple"
                        title="워크북" desc="어휘·어법·Mastery 3단계 자동 생성"
                        icon={<span className="text-2xl">📚</span>} />

                    {/* Row 3: 변형문제 객관식 / 변형문제 주관식 / 내신대비 일괄생성 */}
                    <TypeCard type="transform" color="violet"
                        title="변형문제 객관식" desc="수능 스타일 객관식 AI 자동 생성"
                        icon={<svg className="w-6 h-6 text-violet-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>} />
                    <TypeCard type="transform_subjective" color="slate"
                        title="변형문제 주관식" desc="7가지 서술형 문제 AI 출제·채점"
                        icon={<span className="text-2xl">✏️</span>} />
                    <TypeCard type="inaesin_batch" color="rose"
                        title="내신대비 일괄생성" desc="본문분석·구조독해·변형문제 일괄 생성"
                        icon={<span className="text-2xl">⚡</span>}
                        onClick={() => { setAssignmentType('inaesin_batch'); setCreationStep('form'); }} />

                    {/* Row 4: 외부지문 서술형 / 내신모의고사 / 듣기세트 */}
                    <TypeCard type="external_subjective" color="purple"
                        title="외부지문 서술형" desc="외부 지문 내신 서술형 AI 출제·채점"
                        icon={<span className="text-2xl">📝</span>}
                        newBadge={true} />
                    <TypeCard type="mock_exam" color="rose"
                        title="내신모의고사" desc="학교별 출제패턴 실전 모의고사 생성"
                        icon={<span className="text-2xl">🏫</span>}
                        newBadge={true} />
                    <TypeCard type="listening_set" color="teal"
                        title="듣기세트" desc="수능 듣기 17문제 + 독해 10문제 TTS"
                        icon={<span className="text-2xl">🎧</span>}
                        newBadge={true} />
                </div>

                {isImportModalOpen && (
                    <AssignmentImportModal
                        onClose={() => setIsImportModalOpen(false)}
                        onSelect={handleImportSelect}
                        classes={classes}
                    />
                )}
            </div>
        );
    }

    // ============================
    // FORM: Delegate to extracted modules
    // ============================
    const selectedClass = selectedClassIds.length > 0
        ? classes.find(c => c.id === selectedClassIds[0]) || null
        : null;

    // Inaesin Batch
    if (assignmentType === 'inaesin_batch') {
        return (
            <div className="h-full overflow-y-auto">
                <InaesinBatchForm
                    selectedClass={selectedClass}
                    onBack={handleBack}
                    onSave={onSave}
                    onClose={onClose}
                />
            </div>
        );
    }

    // Transform
    if (assignmentType === 'transform') {
        return (
            <div className="h-full overflow-y-auto">
                <TransformAssignmentForm
                    selectedClass={selectedClass}
                    initialData={initialData}
                    onBack={handleBack}
                    onSave={makeSaveHandler('변형 문제')}
                />
            </div>
        );
    }

    // Transform Subjective
    if (assignmentType === 'transform_subjective') {
        return (
            <div className="h-full overflow-y-auto">
                <SubjectiveAssignmentForm
                    selectedClass={selectedClass}
                    initialData={initialData}
                    onBack={handleBack}
                    onSave={makeSaveHandler('변형주관')}
                />
            </div>
        );
    }

    // External Subjective
    if (assignmentType === 'external_subjective') {
        return (
            <div className="h-full overflow-y-auto">
                <ExternalSubjectiveForm
                    selectedClass={selectedClass}
                    initialData={initialData}
                    onBack={handleBack}
                    onSave={makeSaveHandler('외부지문')}
                />
            </div>
        );
    }

    // Workbook
    if (assignmentType === 'workbook') {
        return (
            <div className="h-full overflow-y-auto">
                <WorkbookAssignmentForm
                    selectedClass={selectedClass}
                    initialData={initialData}
                    onBack={handleBack}
                    onSave={makeSaveHandler('워크북')}
                />
            </div>
        );
    }

    // Listening Set
    if (assignmentType === 'listening_set') {
        return (
            <div className="h-full overflow-y-auto">
                <ListeningSetForm
                    selectedClass={selectedClass}
                    initialData={initialData}
                    onBack={handleBack}
                    onSave={makeSaveHandler('듣기세트')}
                />
            </div>
        );
    }

    // Sentence Order
    if (assignmentType === 'sentence_order') {
        return (
            <div className="h-full overflow-y-auto">
                <SentenceOrderForm
                    selectedClass={selectedClass}
                    initialData={initialData}
                    onBack={handleBack}
                    onSave={makeSaveHandler('세부순서')}
                />
            </div>
        );
    }

    // Mock Exam
    if (assignmentType === 'mock_exam') {
        return (
            <div className="h-full overflow-y-auto">
                <MockExamForm
                    selectedClass={selectedClass}
                    initialData={initialData}
                    onBack={handleBack}
                    onSave={makeSaveHandler('내신모의고사')}
                />
            </div>
        );
    }

    // Writing
    if (assignmentType === 'writing') {
        return (
            <div className="h-full overflow-y-auto">
                <WritingAssignmentForm
                    selectedClass={selectedClass}
                    initialData={initialData}
                    onBack={handleBack}
                    onSave={makeSaveHandler('구조작문')}
                />
            </div>
        );
    }

    // Structure / Vocabulary / Selection / Analysis → StructureVocabForm
    return (
        <div className="h-full overflow-y-auto">
            <StructureVocabForm
                assignmentType={assignmentType as 'structure' | 'vocabulary' | 'selection' | 'analysis'}
                classes={classes.map(c => ({ id: c.id, name: c.name }))}
                initialClassId={initialClassId}
                onBack={handleBack}
                onSave={onSave}
                onClose={onClose}
                initialData={initialData}
            />
        </div>
    );
}
