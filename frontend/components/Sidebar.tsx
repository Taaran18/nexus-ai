"use client";

import {
  ChevronDown,
  ChevronRight,
  Folder as FolderIcon,
  FolderPlus,
  MessageSquare,
  MoreHorizontal,
  PanelLeft,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { ChatSession, Folder } from "@/lib/types";

/* ── ConfirmDialog ──────────────────────────────────────────────────────── */

function ConfirmDialog({
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-sm bg-surface rounded-2xl border border-border shadow-2xl shadow-black/30 p-5 animate-fade-up">
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
          <Trash2 size={18} className="text-red-400" />
        </div>

        <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-xs text-foreground-2 leading-relaxed mb-5">
          {description}
        </p>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 px-3 py-2 rounded-xl text-sm font-medium border border-border text-foreground-2 hover:bg-surface-2 hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-3 py-2 rounded-xl text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-colors shadow-sm"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Types ─────────────────────────────────────────────────────────────── */

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

interface SidebarProps {
  sessions: ChatSession[];
  folders: Folder[];
  currentSessionId: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, title: string) => void;
  onMoveSession: (sessionId: string, folderId: string | null) => void;
  onCreateFolder: (name: string, color: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
}

const FOLDER_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#ef4444",
  "#64748b",
];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86_400_000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

/* ── ContextMenu ────────────────────────────────────────────────────────── */

function ContextMenu({
  items,
  onClose,
}: {
  items: MenuItem[];
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-full mt-1 z-50 w-48 py-1 rounded-xl border border-border bg-surface shadow-xl shadow-black/15 animate-fade-up overflow-hidden">
        {items.map((item) => (
          <button
            key={item.label}
            onClick={() => {
              item.onClick();
              onClose();
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
              item.danger
                ? "text-red-500 hover:bg-red-500/10"
                : "text-foreground-2 hover:bg-surface-2 hover:text-foreground"
            }`}
          >
            <span className="opacity-60">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
}

/* ── InlineInput ────────────────────────────────────────────────────────── */

function InlineInput({
  initialValue,
  placeholder,
  onConfirm,
  onCancel,
}: {
  initialValue: string;
  placeholder?: string;
  onConfirm: (v: string) => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  const commit = () => {
    const v = ref.current?.value.trim() ?? "";
    v ? onConfirm(v) : onCancel();
  };
  return (
    <input
      ref={ref}
      defaultValue={initialValue}
      placeholder={placeholder}
      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") onCancel();
      }}
      onBlur={commit}
      className="bg-surface-3 text-foreground text-xs rounded-md px-2 py-1 outline-none border border-accent/50 w-full"
    />
  );
}

/* ── ChatItem ───────────────────────────────────────────────────────────── */

function ChatItem({
  session,
  isActive,
  folders,
  onSelect,
  onDelete,
  onRename,
  onMove,
}: {
  session: ChatSession;
  isActive: boolean;
  folders: Folder[];
  onSelect: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
  onMove: (folderId: string | null) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const menuItems: MenuItem[] = [
    ...folders
      .filter((f) => f.id !== session.folder_id)
      .map((f) => ({
        label: `Move to ${f.name}`,
        icon: <FolderIcon size={13} style={{ color: f.color }} />,
        onClick: () => onMove(f.id),
      })),
    ...(session.folder_id
      ? [
          {
            label: "Remove from folder",
            icon: <FolderIcon size={13} />,
            onClick: () => onMove(null),
          },
        ]
      : []),
    {
      label: "Rename",
      icon: <Pencil size={13} />,
      onClick: () => setRenaming(true),
    },
    {
      label: "Delete",
      icon: <Trash2 size={13} />,
      onClick: () => setConfirming(true),
      danger: true,
    },
  ];

  return (
    <div
      onClick={!renaming ? onSelect : undefined}
      className={`group relative flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-colors select-none ${
        isActive
          ? "bg-accent/10 text-foreground border border-accent/20"
          : "text-foreground-2 hover:bg-surface-2 hover:text-foreground border border-transparent"
      }`}
    >
      <MessageSquare size={13} className="shrink-0 opacity-50" />
      <div className="flex-1 min-w-0">
        {renaming ? (
          <InlineInput
            initialValue={session.title}
            onConfirm={(v) => {
              onRename(v);
              setRenaming(false);
            }}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <>
            <p className="text-xs font-medium truncate">{session.title}</p>
            <p className="text-[10px] text-muted">
              {timeAgo(session.created_at)}
            </p>
          </>
        )}
      </div>
      {!renaming && (
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu((v) => !v);
            }}
            className={`p-1 rounded-md transition-colors ${
              showMenu
                ? "opacity-100 bg-surface-3 text-foreground"
                : "opacity-0 group-hover:opacity-100 hover:bg-surface-3 text-muted"
            }`}
          >
            <MoreHorizontal size={13} />
          </button>
          {showMenu && (
            <ContextMenu items={menuItems} onClose={() => setShowMenu(false)} />
          )}
        </div>
      )}

      {confirming && (
        <ConfirmDialog
          title="Delete chat?"
          description={`"${session.title}" and all its messages will be permanently deleted.`}
          confirmLabel="Delete chat"
          onConfirm={() => {
            setConfirming(false);
            onDelete();
          }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}

/* ── FolderItem ─────────────────────────────────────────────────────────── */

function FolderItem({
  folder,
  sessions,
  currentSessionId,
  folders,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
  onMoveSession,
  onRenameFolder,
  onDeleteFolder,
}: {
  folder: Folder;
  sessions: ChatSession[];
  currentSessionId: string | null;
  folders: Folder[];
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, title: string) => void;
  onMoveSession: (sessionId: string, folderId: string | null) => void;
  onRenameFolder: (name: string) => void;
  onDeleteFolder: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const menuItems: MenuItem[] = [
    {
      label: "Rename",
      icon: <Pencil size={13} />,
      onClick: () => setRenaming(true),
    },
    {
      label: "Delete folder",
      icon: <Trash2 size={13} />,
      onClick: () => setConfirming(true),
      danger: true,
    },
  ];

  return (
    <div className="mt-1">
      <div className="group flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-surface-2 cursor-pointer transition-colors select-none">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 flex-1 min-w-0"
        >
          {expanded ? (
            <ChevronDown size={12} className="shrink-0 text-muted" />
          ) : (
            <ChevronRight size={12} className="shrink-0 text-muted" />
          )}
          <span
            className="w-2.5 h-2.5 rounded-sm shrink-0"
            style={{ backgroundColor: folder.color }}
          />
          {renaming ? (
            <InlineInput
              initialValue={folder.name}
              onConfirm={(v) => {
                onRenameFolder(v);
                setRenaming(false);
              }}
              onCancel={() => setRenaming(false)}
            />
          ) : (
            <>
              <span className="text-xs font-medium text-foreground-2 truncate">
                {folder.name}
              </span>
              <span className="text-[10px] text-muted ml-auto pr-1">
                {sessions.length}
              </span>
            </>
          )}
        </button>
        {!renaming && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu((v) => !v);
              }}
              className={`p-1 rounded-md transition-colors ${showMenu ? "opacity-100 bg-surface-3 text-foreground" : "opacity-0 group-hover:opacity-100 hover:bg-surface-3 text-muted"}`}
            >
              <MoreHorizontal size={13} />
            </button>
            {showMenu && (
              <ContextMenu
                items={menuItems}
                onClose={() => setShowMenu(false)}
              />
            )}
          </div>
        )}
      </div>

      {confirming && (
        <ConfirmDialog
          title="Delete folder?"
          description={`"${folder.name}" will be deleted. All chats inside will be moved to Recent.`}
          confirmLabel="Delete folder"
          onConfirm={() => {
            setConfirming(false);
            onDeleteFolder();
          }}
          onCancel={() => setConfirming(false)}
        />
      )}

      {expanded && sessions.length > 0 && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-2">
          {sessions.map((s) => (
            <ChatItem
              key={s.id}
              session={s}
              isActive={currentSessionId === s.id}
              folders={folders}
              onSelect={() => onSelectSession(s.id)}
              onDelete={() => onDeleteSession(s.id)}
              onRename={(title) => onRenameSession(s.id, title)}
              onMove={(fid) => onMoveSession(s.id, fid)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── ThemeToggle ────────────────────────────────────────────────────────── */

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-7 h-7" />;
  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="p-1.5 rounded-lg hover:bg-surface-2 text-muted hover:text-foreground transition-colors"
      title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
    >
      {resolvedTheme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}

/* ── NewFolderDialog ────────────────────────────────────────────────────── */

function NewFolderDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: (name: string, color: string) => void;
  onCancel: () => void;
}) {
  const [color, setColor] = useState(FOLDER_COLORS[0]);
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  const commit = () => {
    const v = name.trim();
    if (v) onConfirm(v, color);
    else onCancel();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-sm bg-surface rounded-2xl border border-border shadow-2xl shadow-black/30 p-5 animate-fade-up">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
            style={{
              backgroundColor: `${color}22`,
              border: `1.5px solid ${color}55`,
            }}
          >
            <FolderIcon size={16} style={{ color }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              New Folder
            </h3>
            <p className="text-xs text-muted">
              Organise your chats into a folder
            </p>
          </div>
        </div>

        {/* Colour picker */}
        <p className="text-[10px] font-medium text-muted uppercase tracking-widest mb-2">
          Colour
        </p>
        <div className="flex gap-2 mb-4 flex-wrap">
          {FOLDER_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-6 h-6 rounded-lg transition-transform hover:scale-110 focus:outline-none"
              style={{
                backgroundColor: c,
                transform: color === c ? "scale(1.2)" : undefined,
                boxShadow:
                  color === c ? `0 0 0 2px white, 0 0 0 3px ${c}` : undefined,
              }}
            />
          ))}
        </div>

        {/* Name input */}
        <p className="text-[10px] font-medium text-muted uppercase tracking-widest mb-2">
          Name
        </p>
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Work, Personal, Research…"
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") onCancel();
          }}
          className="w-full text-sm bg-surface-2 text-foreground rounded-xl px-3 py-2.5 outline-none border border-border focus:border-accent/60 placeholder-muted mb-5 transition-colors"
        />

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 px-3 py-2 rounded-xl text-sm font-medium border border-border text-foreground-2 hover:bg-surface-2 hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={commit}
            disabled={!name.trim()}
            className="flex-1 px-3 py-2 rounded-xl text-sm font-medium bg-accent hover:bg-accent-2 text-white transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create Folder
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Sidebar ────────────────────────────────────────────────────────────── */

export function Sidebar({
  sessions,
  folders,
  currentSessionId,
  isOpen,
  onToggle,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onRenameSession,
  onMoveSession,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: SidebarProps) {
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const filtered = searchQuery
    ? sessions.filter((s) =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : null;

  const sessionsByFolder = useCallback(
    (folderId: string | null) =>
      (filtered ?? sessions).filter((s) => (s.folder_id ?? null) === folderId),
    [sessions, filtered],
  );

  const unfoldered = sessionsByFolder(null);

  /* Collapsed — desktop-only strip, hidden on mobile */
  if (!isOpen) {
    return (
      <div className="hidden md:flex flex-col items-center py-3 gap-2 bg-surface border-r border-border w-12 shrink-0">
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-surface-2 text-muted hover:text-foreground transition-colors"
          title="Open sidebar"
        >
          <PanelLeft size={16} />
        </button>
        <button
          onClick={onNewChat}
          className="p-1.5 rounded-lg hover:bg-surface-2 text-muted hover:text-foreground transition-colors"
          title="New chat"
        >
          <Plus size={16} />
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden animate-fade-in"
        onClick={onToggle}
      />

      {/* Sidebar panel — overlay on mobile, in-flow on desktop */}
      <div className="fixed inset-y-0 left-0 z-50 md:relative md:z-auto flex flex-col w-72 md:w-64 bg-surface border-r border-border shrink-0 animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center shadow-sm">
              <Zap size={12} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-foreground tracking-tight">
              Nexus
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => {
                setShowSearch((v) => !v);
                setSearchQuery("");
              }}
              className="p-1.5 rounded-lg hover:bg-surface-2 text-muted hover:text-foreground transition-colors"
              title="Search conversations"
            >
              <Search size={14} />
            </button>
            <ThemeToggle />
            <button
              onClick={onToggle}
              className="p-1.5 rounded-lg hover:bg-surface-2 text-muted hover:text-foreground transition-colors"
            >
              <PanelLeft size={15} />
            </button>
          </div>
        </div>

        {/* Search bar */}
        {showSearch && (
          <div className="px-3 pt-2 pb-1 animate-fade-in">
            <div className="flex items-center gap-2 bg-surface-2 rounded-lg px-2.5 py-1.5 border border-border focus-within:border-accent/50">
              <Search size={12} className="text-muted shrink-0" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats…"
                className="flex-1 text-xs bg-transparent text-foreground placeholder-muted outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-muted hover:text-foreground"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* New Chat */}
        <div className="px-3 pt-3 pb-1">
          <button
            onClick={onNewChat}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-accent text-white hover:bg-accent-2 transition-colors text-sm font-medium shadow-sm shadow-accent/20"
          >
            <Plus size={15} />
            New Chat
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-3 space-y-4">
          {/* Folders section */}
          {!searchQuery && (
            <div>
              <div className="flex items-center justify-between px-1 mb-1">
                <span className="text-[10px] font-semibold text-muted uppercase tracking-widest">
                  Folders
                </span>
                <button
                  onClick={() => setCreatingFolder(true)}
                  className="p-1 rounded-md hover:bg-surface-2 text-muted hover:text-foreground transition-colors"
                  title="New folder"
                >
                  <FolderPlus size={13} />
                </button>
              </div>

              {creatingFolder && (
                <NewFolderDialog
                  onConfirm={(name, color) => {
                    onCreateFolder(name, color);
                    setCreatingFolder(false);
                  }}
                  onCancel={() => setCreatingFolder(false)}
                />
              )}

              {folders.length === 0 && !creatingFolder && (
                <p className="text-[11px] text-muted px-2 py-1">
                  No folders yet
                </p>
              )}

              {folders.map((folder) => (
                <FolderItem
                  key={folder.id}
                  folder={folder}
                  sessions={sessionsByFolder(folder.id)}
                  currentSessionId={currentSessionId}
                  folders={folders}
                  onSelectSession={onSelectSession}
                  onDeleteSession={onDeleteSession}
                  onRenameSession={onRenameSession}
                  onMoveSession={onMoveSession}
                  onRenameFolder={(name) => onRenameFolder(folder.id, name)}
                  onDeleteFolder={() => onDeleteFolder(folder.id)}
                />
              ))}
            </div>
          )}

          {/* Recent / search results */}
          {(unfoldered.length > 0 || searchQuery) && (
            <div>
              <div className="px-1 mb-1">
                <span className="text-[10px] font-semibold text-muted uppercase tracking-widest">
                  {searchQuery
                    ? `Results (${(filtered ?? []).length})`
                    : "Recent"}
                </span>
              </div>
              <div className="space-y-0.5">
                {(searchQuery ? (filtered ?? []) : unfoldered).map((s) => (
                  <ChatItem
                    key={s.id}
                    session={s}
                    isActive={currentSessionId === s.id}
                    folders={folders}
                    onSelect={() => onSelectSession(s.id)}
                    onDelete={() => onDeleteSession(s.id)}
                    onRename={(title) => onRenameSession(s.id, title)}
                    onMove={(fid) => onMoveSession(s.id, fid)}
                  />
                ))}
              </div>
            </div>
          )}

          {sessions.length === 0 && (
            <p className="text-xs text-muted text-center py-6 px-4 leading-relaxed">
              No conversations yet.
              <br />
              Start a new chat!
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2.5 border-t border-border">
          <p className="text-[10px] text-muted text-center">
            LangGraph · LangChain · Groq
          </p>
        </div>
      </div>
    </>
  );
}
