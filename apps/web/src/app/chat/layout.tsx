"use client";

/**
 * Chat Layout — wraps all /chat routes with sidebar + connection management
 *
 * Responsive layout:
 * - Desktop: sidebar (left) + chat area (right)
 * - Mobile: drawer sidebar + full-width chat
 */

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ConversationSidebar } from "@/components/chat/conversation-sidebar";
import { useChatStore } from "@/stores/chat-store";
import { useAuthStore } from "@/stores/auth-store";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, initialize } = useAuthStore();
  const { connect, disconnect, joinRoom, loadMessages, createConversation, clearMessages } =
    useChatStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Initialize auth
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Connect WebSocket when authenticated
  useEffect(() => {
    if (user) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [user, connect, disconnect]);

  const handleSelectConversation = useCallback(
    async (id: string) => {
      clearMessages();
      await loadMessages(id);
      joinRoom(id);
      setSidebarOpen(false);
      router.push(`/chat/${id}`);
    },
    [clearMessages, loadMessages, joinRoom, router]
  );

  const handleNewChat = useCallback(async () => {
    const id = await createConversation();
    if (id) {
      clearMessages();
      joinRoom(id);
      setSidebarOpen(false);
      router.push(`/chat/${id}`);
    }
  }, [createConversation, clearMessages, joinRoom, router]);

  return (
    <div className="flex h-[calc(100vh-65px)] overflow-hidden">
      <ConversationSidebar
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
