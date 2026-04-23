'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { dbService } from '@/services/db';
import { Class, Assignment } from '@/types';
import AssignmentEditor from '@/components/admin/AssignmentEditor';

export default function EditAssignmentPage() {
    const router = useRouter();
    const params = useParams();
    const assignmentId = params.id as string;

    const [classes, setClasses] = useState<Class[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [assignment, setAssignment] = useState<Assignment | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadContext = async () => {
            try {
                const [cls, std, ass] = await Promise.all([
                    dbService.getClasses(),
                    dbService.getStudents(),
                    dbService.getAssignmentById(assignmentId)
                ]);
                setClasses(cls);
                setStudents(std);
                setAssignment(ass);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        if (assignmentId) loadContext();
    }, [assignmentId]);

    if (loading) return <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

    if (!assignment) return <div className="p-10 text-center">과제를 찾을 수 없습니다.</div>;

    return (
        <div className="h-screen flex flex-col bg-[#F8FAFC]">
            <AssignmentEditor
                initialClassId={assignment.classId} // Legacy support
                classes={classes}
                allStudents={students}
                onClose={() => router.back()}
                onSave={() => router.back()}
                initialData={assignment}
            />
        </div>
    );
}
