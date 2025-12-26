import { supabase } from './client';
import type { VocabularyClass, VocabularySet, VocabularyWord, ChunkReadingPassage } from '@/types/vocabulary';

// ===== CLASS MANAGEMENT =====

export async function getAllClasses(): Promise<VocabularyClass[]> {
    const { data, error } = await supabase
        .from('vocabulary_classes')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching classes:', error);
        return [];
    }

    return data.map((c: any) => ({
        id: c.id,
        name: c.name,
        parentClassId: c.parent_class_id || undefined,
        description: c.description || undefined,
        color: c.color || '#3B82F6',
        createdAt: new Date(c.created_at),
        updatedAt: new Date(c.updated_at),
    }));
}

export async function getClassById(id: string): Promise<VocabularyClass | undefined> {
    const { data, error } = await supabase
        .from('vocabulary_classes')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) {
        console.error('Error fetching class:', error);
        return undefined;
    }

    return {
        id: data.id,
        name: data.name,
        parentClassId: data.parent_class_id || undefined,
        description: data.description || undefined,
        color: data.color || '#3B82F6',
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
    };
}

export async function createClass(
    classData: Omit<VocabularyClass, 'id' | 'createdAt' | 'updatedAt'> & { createdBy: string }
): Promise<VocabularyClass | null> {
    const { data, error } = await supabase
        .from('vocabulary_classes')
        .insert({
            name: classData.name,
            parent_class_id: classData.parentClassId,
            description: classData.description,
            color: classData.color || '#3B82F6',
            created_by: classData.createdBy,
        })
        .select()
        .single();

    if (error || !data) {
        console.error('Error creating class:', error);
        return null;
    }

    return {
        id: data.id,
        name: data.name,
        parentClassId: data.parent_class_id || undefined,
        description: data.description || undefined,
        color: data.color || '#3B82F6',
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
    };
}

export async function updateClass(
    id: string,
    updates: Partial<VocabularyClass>
): Promise<VocabularyClass | null> {
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.color) dbUpdates.color = updates.color;
    if (updates.parentClassId !== undefined) dbUpdates.parent_class_id = updates.parentClassId;

    const { data, error } = await supabase
        .from('vocabulary_classes')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

    if (error || !data) {
        console.error('Error updating class:', error);
        return null;
    }

    return {
        id: data.id,
        name: data.name,
        parentClassId: data.parent_class_id || undefined,
        description: data.description || undefined,
        color: data.color || '#3B82F6',
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
    };
}

export async function deleteClass(id: string): Promise<boolean> {
    const { error } = await supabase.from('vocabulary_classes').delete().eq('id', id);

    if (error) {
        console.error('Error deleting class:', error);
        return false;
    }

    return true;
}

// ===== SET MANAGEMENT =====

export async function getSetsByClassId(classId: string): Promise<VocabularySet[]> {
    const { data, error } = await supabase
        .from('vocabulary_sets')
        .select('*')
        .eq('class_id', classId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching sets:', error);
        return [];
    }

    // Fetch words and passages for each set
    const setsWithData = await Promise.all(
        data.map(async (s: any) => {
            // Fetch words
            const { data: words } = await supabase
                .from('vocabulary_words')
                .select('*')
                .eq('set_id', s.id);

            // Fetch passages if chunk-reading type
            let passages: ChunkReadingPassage[] | undefined = undefined;
            if (s.type === 'chunk-reading') {
                const { data: passageData } = await supabase
                    .from('passages')
                    .select('*')
                    .eq('set_id', s.id);

                passages = passageData?.map((p: any) => ({
                    id: p.id,
                    title: p.title,
                    rawText: p.raw_text,
                    sentences: p.sentences,
                    difficulty: p.difficulty,
                    source: p.source || undefined,
                    createdAt: new Date(p.created_at),
                }));
            }

            return {
                id: s.id,
                classId: s.class_id,
                type: s.type,
                name: s.name,
                description: s.description || undefined,
                words: words?.map((w: any) => ({
                    id: w.id,
                    word: w.word,
                    meaning: w.meaning,
                    example: w.example || undefined,
                    pronunciation: w.pronunciation || undefined,
                    level: w.level as any,
                    partOfSpeech: w.part_of_speech || undefined,
                    synonyms: w.synonyms || undefined,
                    antonyms: w.antonyms || undefined,
                })) || [],
                passages,
                createdAt: new Date(s.created_at),
                updatedAt: new Date(s.updated_at),
            };
        })
    );

    return setsWithData;
}

export async function getSetById(id: string): Promise<VocabularySet | undefined> {
    const { data, error } = await supabase
        .from('vocabulary_sets')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) {
        console.error('Error fetching set:', error);
        return undefined;
    }

    // Fetch words
    const { data: words } = await supabase
        .from('vocabulary_words')
        .select('*')
        .eq('set_id', data.id);

    // Fetch passages if chunk-reading
    let passages: ChunkReadingPassage[] | undefined = undefined;
    if (data.type === 'chunk-reading') {
        const { data: passageData } = await supabase
            .from('passages')
            .select('*')
            .eq('set_id', data.id);

        passages = passageData?.map((p: any) => ({
            id: p.id,
            title: p.title,
            rawText: p.raw_text,
            sentences: p.sentences,
            difficulty: p.difficulty,
            source: p.source || undefined,
            createdAt: new Date(p.created_at),
        }));
    }

    return {
        id: data.id,
        classId: data.class_id,
        type: data.type,
        name: data.name,
        description: data.description || undefined,
        words: words?.map((w: any) => ({
            id: w.id,
            word: w.word,
            meaning: w.meaning,
            example: w.example || undefined,
            pronunciation: w.pronunciation || undefined,
            level: w.level as any,
            partOfSpeech: w.part_of_speech || undefined,
            synonyms: w.synonyms || undefined,
            antonyms: w.antonyms || undefined,
        })) || [],
        passages,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
    };
}

export async function createSet(
    setData: Omit<VocabularySet, 'id' | 'createdAt' | 'updatedAt' | 'words' | 'passages'>
): Promise<VocabularySet | null> {
    const { data, error } = await supabase
        .from('vocabulary_sets')
        .insert({
            class_id: setData.classId,
            type: setData.type,
            name: setData.name,
            description: setData.description,
        })
        .select()
        .single();

    if (error || !data) {
        console.error('Error creating set:', error);
        return null;
    }

    return {
        id: data.id,
        classId: data.class_id,
        type: data.type,
        name: data.name,
        description: data.description || undefined,
        words: [],
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
    };
}

export async function deleteSet(id: string): Promise<boolean> {
    const { error } = await supabase.from('vocabulary_sets').delete().eq('id', id);

    if (error) {
        console.error('Error deleting set:', error);
        return false;
    }

    return true;
}

// ===== WORD MANAGEMENT =====

export async function addWordsToSet(
    setId: string,
    words: Omit<VocabularyWord, 'id'>[]
): Promise<VocabularySet | null> {
    const wordsToInsert = words.map((w) => ({
        set_id: setId,
        word: w.word,
        meaning: w.meaning,
        example: w.example,
        pronunciation: w.pronunciation,
        level: w.level,
        part_of_speech: w.partOfSpeech,
        synonyms: w.synonyms,
        antonyms: w.antonyms,
    }));

    const { error } = await supabase.from('vocabulary_words').insert(wordsToInsert);

    if (error) {
        console.error('Error adding words:', error);
        return null;
    }

    // Return updated set
    return getSetById(setId) as Promise<VocabularySet | null>;
}

export async function removeWordsFromSet(
    setId: string,
    wordIds: string[]
): Promise<VocabularySet | null> {
    const { error } = await supabase
        .from('vocabulary_words')
        .delete()
        .in('id', wordIds)
        .eq('set_id', setId);

    if (error) {
        console.error('Error removing words:', error);
        return null;
    }

    return getSetById(setId) as Promise<VocabularySet | null>;
}

export async function updateWordInSet(
    setId: string,
    wordId: string,
    updates: Partial<VocabularyWord>
): Promise<VocabularySet | null> {
    const dbUpdates: any = {};
    if (updates.word) dbUpdates.word = updates.word;
    if (updates.meaning) dbUpdates.meaning = updates.meaning;
    if (updates.example !== undefined) dbUpdates.example = updates.example;
    if (updates.pronunciation !== undefined) dbUpdates.pronunciation = updates.pronunciation;
    if (updates.level) dbUpdates.level = updates.level;
    if (updates.partOfSpeech) dbUpdates.part_of_speech = updates.partOfSpeech;
    if (updates.synonyms) dbUpdates.synonyms = updates.synonyms;
    if (updates.antonyms) dbUpdates.antonyms = updates.antonyms;

    const { error } = await supabase
        .from('vocabulary_words')
        .update(dbUpdates)
        .eq('id', wordId)
        .eq('set_id', setId);

    if (error) {
        console.error('Error updating word:', error);
        return null;
    }

    return getSetById(setId) as Promise<VocabularySet | null>;
}
