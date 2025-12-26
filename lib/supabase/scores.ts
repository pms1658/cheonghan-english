import { supabase } from './client';
import type { WordGroup } from '@/types/chunk-reading';

/**
 * Save or update a score for a student's sentence
 */
export async function saveScore(data: {
    studentId: string;
    passageId: string;
    sentenceIndex: number;
    chunkReadingScore?: number;
    translationScore?: number;
}): Promise<boolean> {
    // Check if score already exists
    const { data: existing } = await supabase
        .from('scores')
        .select('*')
        .eq('student_id', data.studentId)
        .eq('passage_id', data.passageId)
        .eq('sentence_index', data.sentenceIndex)
        .single();

    const scoreData = {
        student_id: data.studentId,
        passage_id: data.passageId,
        sentence_index: data.sentenceIndex,
        chunk_reading_score: data.chunkReadingScore ?? null,
        translation_score: data.translationScore ?? null,
    };

    if (existing) {
        // Update existing score
        const { error } = await supabase
            .from('scores')
            .update({
                chunk_reading_score: scoreData.chunk_reading_score ?? existing.chunk_reading_score,
                translation_score: scoreData.translation_score ?? existing.translation_score,
            })
            .eq('id', existing.id);

        if (error) {
            console.error('Error updating score:', error);
            return false;
        }
    } else {
        // Insert new score
        const { error } = await supabase.from('scores').insert(scoreData);

        if (error) {
            console.error('Error inserting score:', error);
            return false;
        }
    }

    return true;
}

/**
 * Get all scores for a student's passage
 */
export async function getStudentScores(studentId: string, passageId: string) {
    const { data, error } = await supabase
        .from('scores')
        .select('*')
        .eq('student_id', studentId)
        .eq('passage_id', passageId)
        .order('sentence_index', { ascending: true });

    if (error) {
        console.error('Error fetching scores:', error);
        return [];
    }

    return data;
}

/**
 * Get scores for all students in a class (Admin view)
 */
export async function getClassScores(classId: string) {
    // Join through class_students to get all students in class
    const { data, error } = await supabase
        .from('scores')
        .select(
            `
            *,
            users!scores_student_id_fkey(name, username),
            passages(title, set_id)
        `
        )
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching class scores:', error);
        return [];
    }

    return data;
}

/**
 * Save or update sentence analysis (student's markings)
 */
export async function saveSentenceAnalysis(data: {
    studentId: string;
    passageId: string;
    sentenceIndex: number;
    groups: WordGroup[];
    translation?: string;
    completed?: boolean;
}): Promise<boolean> {
    // Check if analysis already exists
    const { data: existing } = await supabase
        .from('sentence_analyses')
        .select('*')
        .eq('student_id', data.studentId)
        .eq('passage_id', data.passageId)
        .eq('sentence_index', data.sentenceIndex)
        .single();

    const analysisData = {
        student_id: data.studentId,
        passage_id: data.passageId,
        sentence_index: data.sentenceIndex,
        groups: data.groups,
        translation: data.translation ?? null,
        completed: data.completed ?? false,
    };

    if (existing) {
        // Update existing analysis
        const { error } = await supabase
            .from('sentence_analyses')
            .update(analysisData)
            .eq('id', existing.id);

        if (error) {
            console.error('Error updating sentence analysis:', error);
            return false;
        }
    } else {
        // Insert new analysis
        const { error } = await supabase.from('sentence_analyses').insert(analysisData);

        if (error) {
            console.error('Error inserting sentence analysis:', error);
            return false;
        }
    }

    return true;
}

/**
 * Get sentence analysis for a student
 */
export async function getSentenceAnalysis(
    studentId: string,
    passageId: string,
    sentenceIndex: number
) {
    const { data, error } = await supabase
        .from('sentence_analyses')
        .select('*')
        .eq('student_id', studentId)
        .eq('passage_id', passageId)
        .eq('sentence_index', sentenceIndex)
        .single();

    if (error) {
        console.error('Error fetching sentence analysis:', error);
        return null;
    }

    return data;
}

/**
 * Get all analyses for a passage by a student
 */
export async function getAllSentenceAnalyses(studentId: string, passageId: string) {
    const { data, error } = await supabase
        .from('sentence_analyses')
        .select('*')
        .eq('student_id', studentId)
        .eq('passage_id', passageId)
        .order('sentence_index', { ascending: true });

    if (error) {
        console.error('Error fetching sentence analyses:', error);
        return [];
    }

    return data;
}
