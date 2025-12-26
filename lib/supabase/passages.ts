import { supabase } from './client';
import type { Passage } from '@/types/chunk-reading';

/**
 * Create a new passage (Admin only)
 */
export async function createPassage(data: {
    title: string;
    rawText: string;
    sentences: string[];
    difficulty: 'easy' | 'medium' | 'hard';
    source?: string;
    setId?: string;
    createdBy: string;
}): Promise<Passage | null> {
    const { data: passage, error } = await supabase
        .from('passages')
        .insert({
            title: data.title,
            raw_text: data.rawText,
            sentences: data.sentences,
            difficulty: data.difficulty,
            source: data.source,
            set_id: data.setId,
            created_by: data.createdBy,
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating passage:', error);
        return null;
    }

    // Transform to match existing Passage type
    return {
        id: passage.id,
        title: passage.title,
        rawText: passage.raw_text,
        sentences: passage.sentences,
        difficulty: passage.difficulty,
        source: passage.source || undefined,
        createdBy: passage.created_by || '',
        assignedTo: [], // Will be handled via set assignment
        createdAt: new Date(passage.created_at),
    };
}

/**
 * Get passage by ID
 */
export async function getPassageById(id: string): Promise<Passage | null> {
    const { data, error } = await supabase
        .from('passages')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) {
        console.error('Error fetching passage:', error);
        return null;
    }

    return {
        id: data.id,
        title: data.title,
        rawText: data.raw_text,
        sentences: data.sentences,
        difficulty: data.difficulty,
        source: data.source || undefined,
        createdBy: data.created_by || '',
        assignedTo: [],
        createdAt: new Date(data.created_at),
    };
}

/**
 * Get all passages by set ID
 */
export async function getPassagesBySetId(setId: string): Promise<Passage[]> {
    const { data, error } = await supabase
        .from('passages')
        .select('*')
        .eq('set_id', setId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching passages:', error);
        return [];
    }

    return data.map((p: any) => ({
        id: p.id,
        title: p.title,
        rawText: p.raw_text,
        sentences: p.sentences,
        difficulty: p.difficulty,
        source: p.source || undefined,
        createdBy: p.created_by || '',
        assignedTo: [],
        createdAt: new Date(p.created_at),
    }));
}

/**
 * Get all passages (Admin only)
 */
export async function getAllPassages(): Promise<Passage[]> {
    const { data, error } = await supabase
        .from('passages')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching passages:', error);
        return [];
    }

    return data.map((p: any) => ({
        id: p.id,
        title: p.title,
        rawText: p.raw_text,
        sentences: p.sentences,
        difficulty: p.difficulty,
        source: p.source || undefined,
        createdBy: p.created_by || '',
        assignedTo: [],
        createdAt: new Date(p.created_at),
    }));
}

/**
 * Update passage
 */
export async function updatePassage(
    id: string,
    updates: Partial<{
        title: string;
        rawText: string;
        sentences: string[];
        difficulty: 'easy' | 'medium' | 'hard';
        source: string;
    }>
): Promise<Passage | null> {
    const dbUpdates: any = {};
    if (updates.title) dbUpdates.title = updates.title;
    if (updates.rawText) dbUpdates.raw_text = updates.rawText;
    if (updates.sentences) dbUpdates.sentences = updates.sentences;
    if (updates.difficulty) dbUpdates.difficulty = updates.difficulty;
    if (updates.source) dbUpdates.source = updates.source;

    const { data, error } = await supabase
        .from('passages')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

    if (error || !data) {
        console.error('Error updating passage:', error);
        return null;
    }

    return {
        id: data.id,
        title: data.title,
        rawText: data.raw_text,
        sentences: data.sentences,
        difficulty: data.difficulty,
        source: data.source || undefined,
        createdBy: data.created_by || '',
        assignedTo: [],
        createdAt: new Date(data.created_at),
    };
}

/**
 * Delete passage
 */
export async function deletePassage(id: string): Promise<boolean> {
    const { error } = await supabase.from('passages').delete().eq('id', id);

    if (error) {
        console.error('Error deleting passage:', error);
        return false;
    }

    return true;
}
