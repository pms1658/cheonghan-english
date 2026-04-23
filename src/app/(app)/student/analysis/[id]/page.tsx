'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { dbService } from '@/services/db';
import AnalysisViewer from '@/components/student/AnalysisViewer';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function AnalysisPage() {
    const params = useParams();
    const assignmentId = params.id as string;

    const [assignment, setAssignment] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const a = await dbService.getAssignmentById(assignmentId);
                setAssignment(a);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [assignmentId]);

    if (loading) {
        return <LoadingSpinner message="분석 데이터 로딩 중..." variant="skeleton" />;
    }

    if (!assignment) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-xl mb-2">❌</p>
                    <p className="text-slate-500">과제를 찾을 수 없습니다.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-bold text-slate-800 mb-6">{assignment.title}</h1>
            {assignment.sentences?.map((sent: any, idx: number) => (
                <div key={idx} className="mb-8 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50/50 p-6">
                        <h3 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider">Sentence {idx + 1}</h3>
                        <AnalysisViewer sentences={[sent]} expandAll={true} />
                    </div>
                </div>
            ))}
        </div>
    );
}
