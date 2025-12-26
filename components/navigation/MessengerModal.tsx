"use client";

import { useState } from "react";
import { X, Send, Search, Plus } from "lucide-react";
import {
    mockConversations,
    getConversationMessages,
    getOtherParticipant,
    formatMessageTime,
} from "@/lib/messenger-data";
import { Conversation } from "@/types/messenger";

interface MessengerModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUserId?: string;
}

export function MessengerModal({ isOpen, onClose, currentUserId = "teacher-1" }: MessengerModalProps) {
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [messageInput, setMessageInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    if (!isOpen) return null;

    const filteredConversations = mockConversations.filter((conv) => {
        const otherUser = getOtherParticipant(conv, currentUserId);
        return otherUser.name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const currentMessages = selectedConversation
        ? getConversationMessages(selectedConversation.id)
        : [];

    const handleSendMessage = () => {
        if (!messageInput.trim()) return;
        // TODO: Implement actual message sending
        console.log("Sending message:", messageInput);
        setMessageInput("");
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/30 z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right">
                {/* Header */}
                <div className="bg-navy-950 text-white p-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">
                        {selectedConversation ? "메시지" : "메신저"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                {!selectedConversation ? (
                    // Conversation List View
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Search Bar */}
                        <div className="p-4 border-b border-gray-200">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="대화 검색..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-950 focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* New Message Button */}
                        <div className="px-4 py-2">
                            <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-navy-950 hover:bg-navy-900 text-white rounded-lg transition-colors">
                                <Plus className="h-4 w-4" />
                                새 메시지
                            </button>
                        </div>

                        {/* Conversation List */}
                        <div className="flex-1 overflow-y-auto">
                            {filteredConversations.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-gray-500">
                                    메시지가 없습니다
                                </div>
                            ) : (
                                filteredConversations.map((conv) => {
                                    const otherUser = getOtherParticipant(conv, currentUserId);
                                    return (
                                        <button
                                            key={conv.id}
                                            onClick={() => setSelectedConversation(conv)}
                                            className="w-full px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left"
                                        >
                                            <div className="flex items-start gap-3">
                                                {/* Avatar */}
                                                <div className="w-10 h-10 rounded-full bg-navy-950 flex items-center justify-center text-white font-semibold flex-shrink-0">
                                                    {otherUser.name.charAt(0)}
                                                </div>

                                                {/* Message Preview */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="font-semibold text-gray-900">
                                                            {otherUser.name}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            {formatMessageTime(conv.lastMessage.timestamp)}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 truncate">
                                                        {conv.lastMessage.content}
                                                    </p>
                                                </div>

                                                {/* Unread Badge */}
                                                {conv.unreadCount > 0 && (
                                                    <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                                                        {conv.unreadCount}
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                ) : (
                    // Message Thread View
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Conversation Header */}
                        <div className="p-4 border-b border-gray-200 flex items-center gap-3">
                            <button
                                onClick={() => setSelectedConversation(null)}
                                className="text-gray-600 hover:text-gray-900"
                            >
                                ← 뒤로
                            </button>
                            <div className="w-8 h-8 rounded-full bg-navy-950 flex items-center justify-center text-white font-semibold">
                                {getOtherParticipant(selectedConversation, currentUserId).name.charAt(0)}
                            </div>
                            <span className="font-semibold text-gray-900">
                                {getOtherParticipant(selectedConversation, currentUserId).name}
                            </span>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {currentMessages.map((msg) => {
                                const isOwn = msg.senderId === currentUserId;
                                return (
                                    <div
                                        key={msg.id}
                                        className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                                    >
                                        <div
                                            className={`max-w-[75%] rounded-lg px-4 py-2 ${isOwn
                                                    ? "bg-navy-950 text-white"
                                                    : "bg-gray-100 text-gray-900"
                                                }`}
                                        >
                                            <p className="text-sm">{msg.content}</p>
                                            <p
                                                className={`text-xs mt-1 ${isOwn ? "text-gray-300" : "text-gray-500"
                                                    }`}
                                            >
                                                {formatMessageTime(msg.timestamp)}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Message Input */}
                        <div className="p-4 border-t border-gray-200">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="메시지를 입력하세요..."
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-950 focus:border-transparent"
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!messageInput.trim()}
                                    className="px-4 py-2 bg-navy-950 hover:bg-navy-900 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                                >
                                    <Send className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
