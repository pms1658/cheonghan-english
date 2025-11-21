export enum UserRole {
    ADMIN = "ADMIN",
    STUDENT = "STUDENT",
}

export interface User {
    id: string;
    username: string;
    name: string;
    role: UserRole;
    class?: string;
}

export interface Assignment {
    id: string;
    title: string;
    description: string;
    dueDate: Date;
    status: "completed" | "incomplete";
    studentId?: string;
    imageUrls?: string[];
    submittedAt?: Date;
}

export interface AttendanceRecord {
    id: string;
    studentId: string;
    date: Date;
    status: "present" | "absent" | "late";
}

export interface Message {
    id: string;
    senderId: string;
    receiverId: string;
    content: string;
    timestamp: Date;
    read: boolean;
}

export interface StudentPerformance {
    studentId: string;
    subject: string;
    score: number;
    date: Date;
    type: "quiz" | "test" | "homework";
}
