"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send } from "lucide-react";
import { useUser } from "@/lib/user-context";
import { Message } from "@/types/user";

const mockMessages: Message[] = [
    {
        id: "m1",
        senderId: "s1",
        receiverId: "admin-1",
        content: "안녕하세요 선생님, 과제 관련 질문이 있습니다.",
        timestamp: new Date("2025-11-20T15:30:00"),
        read: false,
    },
    {
        id: "m2",
        senderId: "s2",
        receiverId: "admin-1",
        content: "다음 주 시험 범위 확인 부탁드립니다.",
        timestamp: new Date("2025-11-20T14:20:00"),
        read: true,
    },
];

const studentList = [
    { id: "s1", name: "김민준" },
    { id: "s2", name: "이서연" },
    { id: "s3", name: "박지호" },
];

export default function AdminMessagesPage() {
    const { currentUser } = useUser();
    const [messages] = useState<Message[]>(mockMessages);
    const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState("");

    // Group messages by student
    const messagesByStudent = studentList.map((student) => {
        const studentMessages = messages
            .filter((m) => m.senderId === student.id || m.receiverId === student.id)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        const lastMessage = studentMessages[0];
        const unreadCount = studentMessages.filter(m => !m.read && m.senderId === student.id).length;

        return {
            student,
            lastMessage,
            unreadCount,
        };
    }).sort((a, b) => {
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return b.lastMessage.timestamp.getTime() - a.lastMessage.timestamp.getTime();
    });

    const selectedStudentMessages = selectedStudent
        ? messages.filter(
            (m) => m.senderId === selectedStudent || m.receiverId === selectedStudent
        ).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        : [];

    const handleSend = () => {
        if (!newMessage.trim() || !selectedStudent) return;
        // Add message logic here
        setNewMessage("");
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-white">메신저</h2>
                <p className="text-navy-300 mt-2">학생과 소통하기</p>
            </div>

            <div className="grid grid-cols-3 gap-4 h-[600px]">
                {/* Student List */}
                <Card className="bg-navy-800 border-navy-700 text-white col-span-1">
                    <CardHeader>
                        <CardTitle>학생 목록</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-y-auto max-h-[500px]">
                            {messagesByStudent.map(({ student, lastMessage, unreadCount }) => (
                                <div
                                    key={student.id}
                                    onClick={() => setSelectedStudent(student.id)}
                                    className={`p-4 border-b border-navy-700/50 cursor-pointer transition-all ${selectedStudent === student.id
                                            ? "bg-navy-700"
                                            : "hover:bg-navy-700/30"
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-white">{student.name}</span>
                                        {unreadCount > 0 && (
                                            <span className="px-2 py-1 bg-red-600 text-white text-xs rounded-full">
                                                {unreadCount}
                                            </span>
                                        )}
                                    </div>
                                    {lastMessage && (
                                        <p className="text-sm text-navy-400 mt-1 truncate">
                                            {lastMessage.content}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Chat Area */}
                <Card className="bg-navy-800 border-navy-700 text-white col-span-2 flex flex-col">
                    {selectedStudent ? (
                        <>
                            <CardHeader>
                                <CardTitle>
                                    {studentList.find((s) => s.id === selectedStudent)?.name}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col">
                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                                    {selectedStudentMessages.map((message) => {
                                        const isFromMe = message.senderId === currentUser.id;
                                        return (
                                            <div
                                                key={message.id}
                                                className={`flex ${isFromMe ? "justify-end" : "justify-start"}`}
                                            >
                                                <div
                                                    className={`max-w-[70%] px-4 py-2 rounded-lg ${isFromMe
                                                            ? "bg-galaxy-600 text-white"
                                                            : "bg-navy-900 text-navy-100"
                                                        }`}
                                                >
                                                    <p>{message.content}</p>
                                                    <p className="text-xs mt-1 opacity-70">
                                                        {message.timestamp.toLocaleTimeString('ko-KR', {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Input */}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyPress={(e) => e.key === "Enter" && handleSend()}
                                        placeholder="메시지를 입력하세요..."
                                        className="flex-1 px-4 py-2 bg-navy-950 border border-navy-700 rounded-lg text-white placeholder:text-navy-500 focus:outline-none focus:ring-2 focus:ring-galaxy-500"
                                    />
                                    <button
                                        onClick={handleSend}
                                        className="px-4 py-2 bg-galaxy-600 hover:bg-galaxy-500 text-white rounded-lg transition-all"
                                    >
                                        <Send className="h-5 w-5" />
                                    </button>
                                </div>
                            </CardContent>
                        </>
                    ) : (
                        <CardContent className="flex items-center justify-center h-full">
                            <p className="text-navy-500">학생을 선택하세요</p>
                        </CardContent>
                    )}
                </Card>
            </div>
        </div>
    );
}
