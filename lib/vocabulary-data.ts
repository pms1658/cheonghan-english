// This file now uses Supabase for data persistence
// Re-exporting Supabase functions for backward compatibility

export * from './supabase/vocabulary';
export * from './supabase/users';

// Re-export specific functions with their original names
import {
    getAllClasses,
    getClassById,
    createClass,
    updateClass,
    deleteClass,
    getSetsByClassId,
    getSetById,
    createSet,
    deleteSet,
    addWordsToSet,
    removeWordsFromSet,
    updateWordInSet,
} from './supabase/vocabulary';

import {
    getAllStudents,
    getStudentsByClassId,
    addStudentToClass,
    removeStudentFromClass,
} from './supabase/users';

// Export all functions
export {
    getAllClasses,
    getClassById,
    createClass,
    updateClass,
    deleteClass,
    getSetsByClassId,
    getSetById,
    createSet,
    deleteSet,
    addWordsToSet,
    removeWordsFromSet,
    updateWordInSet,
    getAllStudents,
    getStudentsByClassId,
    addStudentToClass,
    removeStudentFromClass,
};

// Deprecated mock data exports - kept for backward compatibility
// These will be empty until Supabase is configured
export const mockClasses: any[] = [];
export const mockSets: any[] = [];
export const mockStudents: any[] = [];

// Additional helper functions for compatibility

export async function addWordToSet(setId: string, word: any): Promise<boolean> {
    const result = await addWordsToSet(setId, [word]);
    return result !== null;
}

export async function removeWordFromSet(setId: string, wordId: string): Promise<boolean> {
    const result = await removeWordsFromSet(setId, [wordId]);
    return result !== null;
}

export async function updateSet(id: string, updates: any): Promise<any> {
    // For now, this is a simple wrapper - you may need to implement updateSet in vocabulary.ts
    return null;
}

export async function addPassageToSet(setId: string, passage: any): Promise<any> {
    // Import passage creation from supabase/passages
    const { createPassage } = await import('./supabase/passages');
    return createPassage({
        ...passage,
        setId,
        createdBy: 'admin', // TODO: Get from auth context
    });
}

export async function removePassageFromSet(setId: string, passageId: string): Promise<any> {
    const { deletePassage } = await import('./supabase/passages');
    return deletePassage(passageId);
}
