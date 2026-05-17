"use client";

/**
 * ConversationSidebar — conversation history list (S5-09)
 *
 * Desktop: sidebar on the left
 * Mobile: slide-out drawer
 *
 * Features:
 * - Recent conversations list
 * - Search conversations
 * - Delete with confirmation
 * - Resume session (click to load)
 * - New Chat button
 */

import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare,
  Plus,
  Search,
  Trash2,
  X,
  Menu,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatStore, type ConversationSummary } from "@/stores/chat-store";

interface ConversationSidebarProps {
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function ConversationSidebar({
  onSelectConversation,
  onNewChat,
  isOpen,
  onToggle,
}: ConversationSidebarProps) {
  const {
    conversations,
    conversationsLoading,
    conversationId,
    loadConversations,
    searchConversations,
    deleteConversation,
  } = useChatStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (query.trim()) {
        searchConversations(query);
      } else {
        loadConversations();
      }
    },
    [searchConversations, loadConversations]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteConversation(id);
      setDeleteConfirm(null);
    },
    [deleteConversation]
  );

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">
          Conversations
        </h2>
        <button
          onClick={onToggle}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--muted)] lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* New Chat */}
      <div className="px-3 py-2">
        <button
          onClick={onNewChat}
          className="flex w-full items-center gap-2 rounded-lg border border-dashed border-[var(--color-accent)] bg-[var(--color-accent)]/5 px-3 py-2.5 text-sm font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--muted)] py-2 pl-9 pr-3 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--color-accent)] focus:outline-none"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2">
        {conversationsLoading ? (
          <div className="space-y-2 px-1 py-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-lg bg-[var(--muted)]"
              />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <MessageSquare className="h-8 w-8 text-[var(--muted-foreground)]" />
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
              {searchQuery ? "No results found" : "No conversations yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-1 py-1">
            {conversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conversationId === conv.id}
                isDeleteConfirm={deleteConfirm === conv.id}
                onSelect={() => onSelectConversation(conv.id)}
                onDelete={() => setDeleteConfirm(conv.id)}
                onConfirmDelete={() => handleDelete(conv.id)}
                onCancelDelete={() => setDeleteConfirm(null)}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={onToggle}
        className="fixed left-4 top-20 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-white border border-[var(--border)] shadow-md text-[var(--muted-foreground)] hover:bg-[var(--muted)] lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Desktop sidebar */}
      <div className="hidden lg:block w-72 shrink-0 border-r border-[var(--border)] bg-white">
        {sidebarContent}
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40 bg-black/30 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onToggle}
            />
            {/* Drawer */}
            <motion.div
              className="fixed left-0 top-0 z-50 h-full w-80 bg-white shadow-xl lg:hidden"
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// --- Conversation Item ---

interface ConversationItemProps {
  conversation: ConversationSummary;
  isActive: boolean;
  isDeleteConfirm: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  formatDate: (dateStr: string) => string;
}

function ConversationItem({
  conversation,
  isActive,
  isDeleteConfirm,
  onSelect,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
  formatDate,
}: ConversationItemProps) {
  const preview =
    conversation.title ||
    conversation.firstMessage?.content?.slice(0, 60) ||
    "New conversation";

  if (isDeleteConfirm) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 p-2">
        <span className="flex-1 text-xs text-[var(--color-error)]">
          Delete?
        </span>
        <button
          onClick={onConfirmDelete}
          className="rounded px-2 py-1 text-xs font-medium text-white bg-[var(--color-error)] hover:bg-[var(--color-error)]/80"
        >
          Yes
        </button>
        <button
          onClick={onCancelDelete}
          className="rounded px-2 py-1 text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onSelect}
      className={`group flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left transition-colors ${
        isActive
          ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
          : "hover:bg-[var(--muted)] text-[var(--foreground)]"
      }`}
    >
      <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />

      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium leading-tight line-clamp-2">
          {preview}
        </p>
        <div className="mt-1 flex items-center gap-2 text-[10px] text-[var(--muted-foreground)]">
          <span className="flex items-center gap-0.5">
            <Clock className="h-2.5 w-2.5" />
            {formatDate(conversation.updatedAt)}
          </span>
          <span>{conversation.messageCount} msgs</span>
        </div>
      </div>

      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="mt-0.5 hidden h-6 w-6 items-center justify-center rounded text-[var(--muted-foreground)] hover:bg-[var(--color-error)]/10 hover:text-[var(--color-error)] group-hover:flex"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </button>
  );
}
