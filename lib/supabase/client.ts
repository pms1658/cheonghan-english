import { createClient } from '@supabase/supabase-js';

// Supabase client configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
        '⚠️ Supabase credentials not found. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local'
    );
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    },
});

// Database types for TypeScript
export type Database = {
    users: {
        id: string;
        username: string;
        email: string;
        name: string;
        role: 'admin' | 'student';
        class_name: string | null;
        created_at: string;
    };
    vocabulary_classes: {
        id: string;
        name: string;
        parent_class_id: string | null;
        description: string | null;
        color: string;
        created_by: string | null;
        created_at: string;
        updated_at: string;
    };
    vocabulary_sets: {
        id: string;
        class_id: string;
        type: 'vocabulary' | 'chunk-reading' | 'sequence';
        name: string;
        description: string | null;
        created_at: string;
        updated_at: string;
    };
    vocabulary_words: {
        id: string;
        set_id: string;
        word: string;
        meaning: string;
        example: string | null;
        pronunciation: string | null;
        level: '고1' | '고2' | '고3' | '수능' | null;
        part_of_speech: string | null;
        synonyms: string[] | null;
        antonyms: string[] | null;
    };
    passages: {
        id: string;
        set_id: string | null;
        title: string;
        raw_text: string;
        sentences: string[];
        difficulty: 'easy' | 'medium' | 'hard';
        source: string | null;
        created_by: string | null;
        created_at: string;
    };
    scores: {
        id: string;
        student_id: string;
        passage_id: string;
        sentence_index: number;
        chunk_reading_score: number | null;
        translation_score: number | null;
        passed: boolean;
        created_at: string;
        updated_at: string;
    };
    sentence_analyses: {
        id: string;
        student_id: string;
        passage_id: string;
        sentence_index: number;
        groups: any; // JSONB - WordGroup[]
        translation: string | null;
        completed: boolean;
        created_at: string;
        updated_at: string;
    };
    class_students: {
        class_id: string;
        student_id: string;
        joined_at: string;
    };
};
