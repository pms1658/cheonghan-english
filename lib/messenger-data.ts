import { Message, Conversation, MessageUser } from "@/types/messenger";

// Mock users
export const mockUsers: MessageUser[] = [
    { id: "teacher-1", name: "김선생님", role: "teacher" },
    { id: "student-1", name: "이지훈", role: "student" },
    { id: "student-2", name: "박서연", role: "student" },
    { id: "student-3", name: "최민준", role: "student" },
];

// Mock messages
export const mockMessages: Message[] = [
    {
        id: "msg-1",
        conversationId: "conv-1",
        senderId: "student-1",
        content: "선생님, 오늘 과제 제출 기한이 언제인가요?",
        timestamp: new Date("2024-11-24T10:30:00"),
        read: false,
    },
    {
        id: "msg-2",
        conversationId: "conv-1",
        senderId: "teacher-1",
        content: "이번 주 금요일까지입니다.",
        timestamp: new Date("2024-11-24T10:45:00"),
        read: true,
    },
    {
        id: "msg-3",
        conversationId: "conv-2",
        senderId: "student-2",
        content: "수업 자료 공유 부탁드립니다!",
        timestamp: new Date("2024-11-24T14:20:00"),
        read: false,
    },
    {
        id: "msg-4",
        conversationId: "conv-3",
        senderId: "teacher-1",
        content: "다음 주 모의고사 일정 확인 부탁드립니다.",
        timestamp: new Date("2024-11-23T16:00:00"),
        read: true,
    },
    {
        id: "msg-5",
        conversationId: "conv-3",
        senderId: "student-3",
        content: "네, 확인했습니다!",
        timestamp: new Date("2024-11-23T16:15:00"),
        read: true,
    },
];

// Mock conversations
export const mockConversations: Conversation[] = [
    {
        id: "conv-1",
        participants: [mockUsers[0], mockUsers[1]], // teacher-1, student-1
        lastMessage: mockMessages[1],
        unreadCount: 1,
    },
    {
        id: "conv-2",
        participants: [mockUsers[0], mockUsers[2]], // teacher-1, student-2
        lastMessage: mockMessages[2],
        unreadCount: 1,
    },
    {
        id: "conv-3",
        participants: [mockUsers[0], mockUsers[3]], // teacher-1, student-3
        lastMessage: mockMessages[4],
        unreadCount: 0,
    },
];

// Helper functions
export function getConversationMessages(conversationId: string): Message[] {
    return mockMessages.filter((msg) => msg.conversationId === conversationId);
}

export function getOtherParticipant(conversation: Conversation, currentUserId: string): MessageUser {
    return conversation.participants.find((p) => p.id !== currentUserId) || conversation.participants[0];
}

export function formatMessageTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days}일 전`;
    } else if (hours > 0) {
        return `${hours}시간 전`;
    } else {
        const minutes = Math.floor(diff / (1000 * 60));
        return minutes > 0 ? `${minutes}분 전` : "방금 전";
    }
}
