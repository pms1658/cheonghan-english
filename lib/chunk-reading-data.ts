// This file now uses Supabase for data persistence
// Keeping exports for backward compatibility with existing code

import { getAllPassages } from './supabase/passages';
import type { Passage } from '@/types/chunk-reading';

// For backward compatibility, export a function that fetches passages
// In the future, components should directly use the Supabase functions
export async function getMockPassages(): Promise<Passage[]> {
    return await getAllPassages();
}

// Legacy sync export - will be empty until Supabase is configured
// Components should migrate to async getMockPassages() or direct Supabase calls
export const mockPassages: Passage[] = [];
