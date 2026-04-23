'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { dbService } from '@/services/db';
import { Class } from '@/types';
import AssignmentEditor from '@/components/admin/AssignmentEditor';

function EditorContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialClassId = searchParams.get('classId') || '';

    // We need to fetch Classes and Students to pass to the Editor
    // Ideally the Editor should fetch these itself, but the current component assumes they are passed.
    // For speed, I'll fetch them here.

    const [classes, setClasses] = useState<Class[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadContext = async () => {
            try {
                const [cls, std] = await Promise.all([
                    dbService.getClasses(),
                    dbService.getStudents()
                ]);
                setClasses(cls);
                setStudents(std);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        loadContext();
    }, []);

    if (loading) return <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

    return (
        <div className="h-screen flex flex-col bg-[#F8FAFC]">
            {/* Top Bar for Editor - customized or reuse Layout? 
                The user requested "Full Page Editor". Usually this implies breaking out of the standard sidebar layout
                to give maximum space for PDF parsing etc.
                However, sticking to the Layout is safer for consistency unless specified "No Sidebar".
                "전체 화면 페이지로 넘어가서" (Go to full screen page) -> 
                Let's assume inside standard layout but taking full height.
            */}

            <AssignmentEditor
                initialClassId={initialClassId}
                classes={classes}
                allStudents={students}
                onClose={() => {
                    if (initialClassId) router.push(`/class/${initialClassId}`);
                    else router.back();
                }}
                onSave={() => {
                    if (initialClassId) router.push(`/class/${initialClassId}`);
                    else router.back();
                }}
            // No initialData for 'New', but if editing, we need another route handling [id]
            />
        </div>
    );
}

export default function NewAssignmentPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center">Loading Editor...</div>}>
            <EditorContent />
        </Suspense>
    );
}
