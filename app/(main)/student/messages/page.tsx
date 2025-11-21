"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send } from "lucide-react";
import { useUser } from "@/lib/user-context";
import { Message } from "@/types/user";

const mockMessages: Message[] = [
    {
        id: "m1",
        senderId: "student-1",
        receiverId: "admin-1",
        content: "안녕하세요 선생님, 과제 관련 질문이 있습니다.",
        timestamp: new Date("2025-11-20T15:30:00"),
        read: true,
    },
    {
        id: "m2",
        senderId: "admin-1",
        receiverId: "student-1",
        content: "네, 무엇이든 물어보세요.",
        timestamp: new Date("2025-11-20T15:35:00"),
        read: true,
    },
];

export default function StudentMessagesPage() {
    const { currentUser } = useUser();
    const [messages] = useState<Message[]>(mockMessages);
    const [newMessage, setNewMessage] = useState("");

    const handleSend = () => {
        if (!newMessage.trim()) return;
        // Add message logic here
        setNewMessage("");
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-white">메신저</h2>
                <p className="text-navy-300 mt-2">선생님과 소통하기</p>
            </div>

            <Card className="bg-navy-800 border-navy-700 text-white h-[600px] flex flex-col">
                <CardHeader>
                    <CardTitle>김선생님</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                        {messages.map((message) => {
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
            </Card>
        </div>
    );
}
