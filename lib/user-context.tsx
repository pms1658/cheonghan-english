"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { User, UserRole } from "@/types/user";

interface UserContextType {
    currentUser: User;
    setCurrentUser: (user: User) => void;
    toggleRole: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// Mock users for demonstration
const mockAdmin: User = {
    id: "admin-1",
    username: "teacher",
    name: "김선생",
    role: UserRole.ADMIN,
};

const mockStudent: User = {
    id: "student-1",
    username: "student123",
    name: "김학생",
    role: UserRole.STUDENT,
    class: "고3-1반",
};

export function UserProvider({ children }: { children: ReactNode }) {
    const [currentUser, setCurrentUser] = useState<User>(mockStudent);

    const toggleRole = () => {
        setCurrentUser((prev) =>
            prev.role === UserRole.ADMIN ? mockStudent : mockAdmin
        );
    };

    return (
        <UserContext.Provider value={{ currentUser, setCurrentUser, toggleRole }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error("useUser must be used within a UserProvider");
    }
    return context;
}
