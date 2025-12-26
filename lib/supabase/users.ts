import { supabase } from './client';
import type { Student } from '@/types/vocabulary';

/**
 * Get all students
 */
export async function getAllStudents(): Promise<Student[]> {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'student')
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching students:', error);
        return [];
    }

    return data.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        joinedAt: new Date(u.created_at),
    }));
}

/**
 * Get students by class ID
 */
export async function getStudentsByClassId(classId: string): Promise<Student[]> {
    const { data, error } = await supabase
        .from('class_students')
        .select('student_id, users!class_students_student_id_fkey(id, name, email, created_at)')
        .eq('class_id', classId);

    if (error) {
        console.error('Error fetching class students:', error);
        return [];
    }

    return data
        .map((cs: any) => {
            const user = cs.users;
            if (!user) return null;
            return {
                id: user.id,
                name: user.name,
                email: user.email,
                joinedAt: new Date(user.created_at),
            };
        })
        .filter((s: any): s is Student => s !== null);
}

/**
 * Add student to class
 */
export async function addStudentToClass(classId: string, studentId: string): Promise<boolean> {
    const { error } = await supabase.from('class_students').insert({
        class_id: classId,
        student_id: studentId,
    });

    if (error) {
        // Check if already exists
        if (error.code === '23505') {
            console.log('Student already in class');
            return false;
        }
        console.error('Error adding student to class:', error);
        return false;
    }

    return true;
}

/**
 * Remove student from class
 */
export async function removeStudentFromClass(classId: string, studentId: string): Promise<boolean> {
    const { error } = await supabase
        .from('class_students')
        .delete()
        .eq('class_id', classId)
        .eq('student_id', studentId);

    if (error) {
        console.error('Error removing student from class:', error);
        return false;
    }

    return true;
}

/**
 * Create a new user (Admin only)
 */
export async function createUser(data: {
    username: string;
    email: string;
    name: string;
    role: 'admin' | 'student';
    className?: string;
}): Promise<any> {
    const { data: user, error } = await supabase
        .from('users')
        .insert({
            username: data.username,
            email: data.email,
            name: data.name,
            role: data.role,
            class_name: data.className,
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating user:', error);
        return null;
    }

    return user;
}
