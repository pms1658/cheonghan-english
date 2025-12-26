import { supabase } from './client';

/**
 * Get current authenticated user
 */
export async function getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
}

/**
 * Get user role from users table
 */
export async function getUserRole(userId: string): Promise<'admin' | 'student' | null> {
    const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Error fetching user role:', error);
        return null;
    }

    return data?.role as 'admin' | 'student' | null;
}

/**
 * Sign in user (simplified - for development)
 * In production, you should use proper Supabase Auth
 */
export async function signIn(username: string, password: string) {
    // For now, just simulate sign-in by fetching user
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

    if (error || !data) {
        throw new Error('Invalid credentials');
    }

    // In production, use: supabase.auth.signInWithPassword({ email, password })
    return data;
}

/**
 * Sign out user
 */
export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

/**
 * Check if current user is admin
 */
export async function isAdmin(): Promise<boolean> {
    const user = await getCurrentUser();
    if (!user) return false;

    const role = await getUserRole(user.id);
    return role === 'admin';
}
