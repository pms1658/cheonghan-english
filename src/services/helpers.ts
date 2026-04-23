import { Assignment } from '../types';
import { dbService, Student } from './db';

// Helper functions for class management
export const classHelpers = {
    // Get student count for a class (real-time calculation)
    getStudentCount: (classId: string, students: Student[]): number => {
        return students.filter(s => s.classIds.includes(classId)).length;
    },

    // Get students in a class
    getClassStudents: (classId: string, students: Student[]): Student[] => {
        return students.filter(s => s.classIds.includes(classId));
    },

    // Get assignment count for a class
    getAssignmentCount: (classId: string, assignments: Assignment[]): number => {
        return assignments.filter(a => a.classIds?.includes(classId)).length;
    },

    // Add student to class
    addStudentToClass: async (studentDocId: string, classId: string, currentClassIds: string[]) => {
        const newClassIds = [...new Set([...currentClassIds, classId])];
        await dbService.updateStudent(studentDocId, { classIds: newClassIds });
    },

    // Remove student from class
    removeStudentFromClass: async (studentDocId: string, classId: string, currentClassIds: string[]) => {
        const newClassIds = currentClassIds.filter(id => id !== classId);
        await dbService.updateStudent(studentDocId, { classIds: newClassIds });
    }
};
