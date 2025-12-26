export interface MessageUser {
    id: string;
    name: string;
    role: "teacher" | "student";
    avatar?: string;
}

export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    timestamp: Date;
    read: boolean;
}

export interface Conversation {
    id: string;
    participants: MessageUser[];
    lastMessage: Message;
    unreadCount: number;
}

export interface MessageThread {
    conversation: Conversation;
    messages: Message[];
}
