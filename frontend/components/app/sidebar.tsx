"use client";

import {
  Brain,
  ChevronRight,
  ChevronsRight,
  FolderPlus,
  LayoutDashboard,
  Library,
  MessageSquarePlus,
  MoreHorizontal,
  Pin,
  PinOff,
  Search,
  Settings,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChatActions } from "@/components/app/chat-actions";
import { useWorkspace } from "@/components/app/workspace-provider";
import { LogoMark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { Menu } from "@/components/ui/menu";
import { Skeleton } from "@/components/ui/misc";
import type { ChatSummary, Folder } from "@/lib/types";
import { cn } from "@/lib/utils";

const COLLAPSED = 76;
const EXPANDED = 288;

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/knowledge", label: "Knowledge Base", icon: Library },
  { href: "/settings", label: "Settings", icon: Settings },
];

function groupChats(chats: ChatSummary[]) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const day = 86_400_000;
  const groups: Array<{ label: string; chats: ChatSummary[] }> = [
    { label: "Today", chats: [] },
    { label: "Yesterday", chats: [] },
    { label: "Previous 7 Days", chats: [] },
    { label: "Previous 30 Days", chats: [] },
    { label: "Older", chats: [] },
  ];
  for (const chat of chats) {
    const time = new Date(chat.updated_at).getTime();
    const index =
      time >= startOfToday.getTime()
        ? 0
        : time >= startOfToday.getTime() - day
          ? 1
          : time >= startOfToday.getTime() - 7 * day
            ? 2
            : time >= startOfToday.getTime() - 30 * day
              ? 3
              : 4;
    groups[index].chats.push(chat);
  }
  return groups.filter((g) => g.chats.length);
}

export function Sidebar({
  pinned,
  onPinnedChange,
  mobile,
  mobileOpen,
  onMobileClose,
}: {
  pinned: boolean;
  onPinnedChange: (value: boolean) => void;
  mobile: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [locks, setLocks] = useState(0);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const enterTimer = useRef<number>(0);
  const leaveTimer = useRef<number>(0);
  const expanded = mobile || pinned || hovered || locks > 0 || keyboardFocus;

  const lock = useCallback(
    (open: boolean) => setLocks((n) => Math.max(0, n + (open ? 1 : -1))),
    [],
  );

  useEffect(
    () => () => {
      window.clearTimeout(enterTimer.current);
      window.clearTimeout(leaveTimer.current);
    },
    [],
  );

  if (mobile) {
    return (
      <>
        <div
          className={cn(
            "fixed inset-0 z-40 bg-overlay transition-opacity duration-300",
            mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          onClick={onMobileClose}
          aria-hidden
        />
        <aside
          aria-label="Sidebar"
          aria-hidden={!mobileOpen}
          inert={!mobileOpen}
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-[min(320px,88vw)] flex-col border-r border-border bg-bg-subtle shadow-pop transition-transform duration-300 ease-out",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <SidebarContent expanded mobile onClose={onMobileClose} lock={lock} />
        </aside>
      </>
    );
  }

  return (
    <aside
      aria-label="Sidebar"
      onPointerEnter={(event) => {
        if (event.pointerType !== "mouse") return;
        window.clearTimeout(leaveTimer.current);
        enterTimer.current = window.setTimeout(() => setHovered(true), 110);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== "mouse") return;
        window.clearTimeout(enterTimer.current);
        leaveTimer.current = window.setTimeout(() => setHovered(false), 240);
      }}
      onFocus={(event) => {
        if ((event.target as HTMLElement).matches(":focus-visible")) setKeyboardFocus(true);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setKeyboardFocus(false);
      }}
      style={{ width: expanded ? EXPANDED : COLLAPSED }}
      className="relative z-30 flex h-dvh shrink-0 flex-col overflow-hidden border-r border-border bg-bg-subtle transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
    >
      <SidebarContent
        expanded={expanded}
        pinned={pinned}
        onPin={() => onPinnedChange(!pinned)}
        lock={lock}
      />
    </aside>
  );
}

function SidebarContent({
  expanded,
  mobile,
  pinned,
  onPin,
  onClose,
  lock,
}: {
  expanded: boolean;
  mobile?: boolean;
  pinned?: boolean;
  onPin?: () => void;
  onClose?: () => void;
  lock: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const { chats, chatsLoading, folders } = useWorkspace();
  const actions = useChatActions();
  const [query, setQuery] = useState("");
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const activeChat = pathname === "/" ? params.get("c") : null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? chats.filter((c) => c.title.toLowerCase().includes(q)) : chats;
  }, [chats, query]);

  const byFolder = useMemo(() => {
    const map: Record<string, ChatSummary[]> = {};
    for (const chat of filtered) if (chat.folder_id) (map[chat.folder_id] ||= []).push(chat);
    return map;
  }, [filtered]);

  const loose = filtered.filter((c) => !c.folder_id || !folders.some((f) => f.id === c.folder_id));
  const groups = groupChats(loose);
  const hide = expanded ? "opacity-100" : "pointer-events-none opacity-0";
  const { usage } = useWorkspace();
  const leftPercent = usage
    ? Math.round((usage.messages_left / Math.max(1, usage.messages_limit)) * 100)
    : 100;
  const usageTitle = usage
    ? `Free trial: ${usage.messages_left} of ${usage.messages_limit} messages left today`
    : "Free trial usage";

  const navigate = () => onClose?.();

  return (
    <div className="flex h-full w-[288px] flex-col">
      <div className="flex h-16 shrink-0 items-center gap-2 px-[18px]">
        <Link
          href="/"
          onClick={navigate}
          className="flex min-w-0 items-center gap-3 rounded-xl"
          aria-label="Nexus AI, new chat"
        >
          <LogoMark className="size-10" />
          <span
            className={cn(
              "font-display text-lg font-extrabold whitespace-nowrap text-fg transition-opacity duration-200",
              hide,
            )}
          >
            Nexus<span className="text-brand"> AI</span>
          </span>
        </Link>
        <div className={cn("ml-auto flex items-center transition-opacity duration-200", hide)}>
          {mobile ? (
            <button
              onClick={onClose}
              aria-label="Close sidebar"
              className="grid size-9 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-fg"
            >
              <X className="size-5" />
            </button>
          ) : (
            <button
              onClick={onPin}
              aria-pressed={pinned}
              aria-label={pinned ? "Unpin sidebar" : "Pin sidebar open"}
              title={pinned ? "Unpin Sidebar" : "Pin Sidebar Open"}
              className={cn(
                "grid size-9 place-items-center rounded-xl transition-colors",
                pinned ? "bg-brand-soft text-brand" : "text-muted hover:bg-surface-2 hover:text-fg",
              )}
            >
              {pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-1 px-3.5 pt-1">
        <Link
          href="/"
          onClick={navigate}
          title="New Chat"
          className={cn(
            "flex h-12 items-center gap-3 overflow-hidden rounded-2xl bg-brand-solid text-on-brand shadow-card transition-[width,background-color] duration-300 hover:bg-brand-hover",
            expanded ? "w-full" : "w-12",
          )}
        >
          <span className="grid size-12 shrink-0 place-items-center">
            <MessageSquarePlus className="size-5" aria-hidden />
          </span>
          <span
            className={cn(
              "text-sm font-bold whitespace-nowrap transition-opacity duration-200",
              hide,
            )}
          >
            New Chat
          </span>
        </Link>
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={navigate}
              title={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-11 items-center gap-3 rounded-2xl text-sm font-semibold transition-colors",
                active ? "bg-brand-soft text-brand" : "text-fg-2 hover:bg-surface-2 hover:text-fg",
              )}
            >
              <span className="grid size-12 shrink-0 place-items-center">
                <item.icon className="size-5" aria-hidden />
              </span>
              <span className={cn("whitespace-nowrap transition-opacity duration-200", hide)}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      <div
        className={cn("mt-4 flex min-h-0 flex-1 flex-col transition-opacity duration-200", hide)}
        aria-hidden={!expanded}
        inert={!expanded}
      >
        <div className="px-3.5">
          <label className="relative block">
            <span className="sr-only">Search chats</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Chats"
              className="h-10 w-full rounded-xl border border-border bg-surface pr-3 pl-10 text-sm text-fg outline-none placeholder:text-muted focus:border-brand"
            />
          </label>
        </div>

        <nav
          aria-label="Chats"
          className="mt-3 min-h-0 flex-1 scrollbar-thin overflow-y-auto px-2.5 pb-4"
        >
          <div className="flex items-center justify-between px-2.5 pt-2 pb-1.5">
            <span className="text-[11px] font-bold tracking-wider text-muted uppercase">
              Folders
            </span>
            <button
              onClick={actions.newFolder}
              aria-label="New folder"
              title="New Folder"
              className="grid size-7 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg"
            >
              <FolderPlus className="size-4" />
            </button>
          </div>
          {folders.length === 0 && (
            <button
              onClick={actions.newFolder}
              className="mx-1 mb-2 w-[calc(100%-0.5rem)] rounded-xl border border-dashed border-border px-3 py-2.5 text-left text-[13px] text-muted hover:border-brand hover:text-brand"
            >
              Create a folder to organise chats
            </button>
          )}
          {folders.map((folder) => (
            <FolderGroup
              key={folder.id}
              folder={folder}
              chats={byFolder[folder.id] ?? []}
              collapsed={collapsedFolders[folder.id] ?? false}
              onToggle={() => setCollapsedFolders((s) => ({ ...s, [folder.id]: !s[folder.id] }))}
              activeChat={activeChat}
              lock={lock}
              onNavigate={navigate}
            />
          ))}

          {chatsLoading ? (
            <div className="space-y-2 px-2 pt-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-9" />
              ))}
            </div>
          ) : chats.length === 0 ? (
            <p className="px-3 pt-5 text-[13px] leading-relaxed text-muted">
              Your chats will appear here. Start one with New Chat.
            </p>
          ) : filtered.length === 0 ? (
            <p className="px-3 pt-5 text-[13px] text-muted">No chats match “{query}”.</p>
          ) : (
            groups.map((group) => (
              <div key={group.label} className="pt-3">
                <p className="px-2.5 pb-1.5 text-[11px] font-bold tracking-wider text-muted uppercase">
                  {group.label}
                </p>
                {group.chats.map((chat) => (
                  <ChatLink
                    key={chat.id}
                    chat={chat}
                    active={chat.id === activeChat}
                    lock={lock}
                    onNavigate={navigate}
                  />
                ))}
              </div>
            ))
          )}
        </nav>
      </div>

      <div className="mt-auto space-y-1 border-t border-border px-3.5 py-3">
        {!expanded && !mobile && (
          <button
            onClick={onPin}
            aria-label="Expand and pin sidebar"
            title="Expand Sidebar"
            className="grid h-10 w-12 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-fg"
          >
            <ChevronsRight className="size-5" />
          </button>
        )}
        <div
          className={cn(
            "overflow-hidden transition-[width] duration-300",
            expanded ? "w-full" : "w-12",
          )}
        >
          <ThemeToggle withLabel={expanded} className={expanded ? undefined : "ml-1"} />
        </div>
        <Link
          href="/settings?tab=usage"
          onClick={navigate}
          title={usageTitle}
          aria-label={usageTitle}
          className="flex h-12 w-full items-center gap-3 rounded-2xl transition-colors hover:bg-surface-2"
        >
          <span className="relative grid size-12 shrink-0 place-items-center">
            <svg viewBox="0 0 36 36" className="size-9 -rotate-90" aria-hidden>
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                strokeWidth="3.5"
                className="stroke-surface-3"
              />
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                strokeWidth="3.5"
                strokeLinecap={leftPercent > 0 ? "round" : "butt"}
                pathLength={100}
                strokeDasharray={`${leftPercent} 100`}
                className={leftPercent <= 20 ? "stroke-danger" : "stroke-brand"}
              />
            </svg>
            <span className="absolute text-[11px] font-bold text-fg">
              {usage ? usage.messages_left : "–"}
            </span>
          </span>
          <span className={cn("min-w-0 flex-1 transition-opacity duration-200", hide)}>
            <span className="block truncate text-sm font-bold text-fg">Free Trial</span>
            <span className="block truncate text-xs text-muted">
              {usage
                ? `${usage.messages_left} of ${usage.messages_limit} messages left today`
                : "Checking your usage"}
            </span>
          </span>
        </Link>
      </div>
    </div>
  );
}

function FolderGroup({
  folder,
  chats,
  collapsed,
  onToggle,
  activeChat,
  lock,
  onNavigate,
}: {
  folder: Folder;
  chats: ChatSummary[];
  collapsed: boolean;
  onToggle: () => void;
  activeChat: string | null;
  lock: (open: boolean) => void;
  onNavigate: () => void;
}) {
  const actions = useChatActions();
  return (
    <div className="mb-0.5">
      <div className="group flex items-center rounded-xl hover:bg-surface-2">
        <button
          onClick={onToggle}
          aria-expanded={!collapsed}
          className="flex h-9 min-w-0 flex-1 items-center gap-2 px-2.5 text-left text-sm font-semibold text-fg-2"
        >
          <ChevronRight
            className={cn(
              "size-3.5 shrink-0 text-muted transition-transform",
              !collapsed && "rotate-90",
            )}
            aria-hidden
          />
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: folder.color }}
            aria-hidden
          />
          <span className="truncate">{folder.name}</span>
          <span className="ml-auto text-xs font-medium text-muted">{chats.length}</span>
        </button>
        <Menu
          ariaLabel={`${folder.name} options`}
          onOpenChange={lock}
          items={actions.folderMenu(folder)}
          trigger={(props) => (
            <button
              {...props}
              aria-label={`Options for folder ${folder.name}`}
              className="mr-1 grid size-7 place-items-center rounded-lg text-muted opacity-100 hover:bg-surface-3 hover:text-fg aria-expanded:opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
            >
              <MoreHorizontal className="size-4" />
            </button>
          )}
        />
      </div>
      {!collapsed && (
        <div className="ml-4 border-l border-border pl-1.5">
          {chats.length === 0 ? (
            <p className="px-3 py-1.5 text-xs text-muted">No chats in this folder yet</p>
          ) : (
            chats.map((chat) => (
              <ChatLink
                key={chat.id}
                chat={chat}
                active={chat.id === activeChat}
                lock={lock}
                onNavigate={onNavigate}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function ChatLink({
  chat,
  active,
  lock,
  onNavigate,
}: {
  chat: ChatSummary;
  active: boolean;
  lock: (open: boolean) => void;
  onNavigate: () => void;
}) {
  const actions = useChatActions();
  return (
    <div
      className={cn(
        "group relative flex items-center rounded-xl transition-colors",
        active ? "bg-surface-3" : "hover:bg-surface-2",
      )}
    >
      <Link
        href={`/?c=${chat.id}`}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex h-9 min-w-0 flex-1 items-center gap-2 pr-9 pl-3 text-sm",
          active ? "font-semibold text-fg" : "text-fg-2",
        )}
      >
        {chat.in_memory && (
          <Brain className="size-3.5 shrink-0 text-brand" aria-label="Saved to memory" />
        )}
        <span className="truncate">{chat.title}</span>
      </Link>
      <Menu
        ariaLabel={`${chat.title} options`}
        onOpenChange={lock}
        items={actions.chatMenu(chat)}
        trigger={(props) => (
          <button
            {...props}
            aria-label={`Options for ${chat.title}`}
            className={cn(
              "absolute right-1 grid size-7 place-items-center rounded-lg text-muted hover:bg-surface-3 hover:text-fg aria-expanded:opacity-100",
              active
                ? "opacity-100"
                : "opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100",
            )}
          >
            <MoreHorizontal className="size-4" />
          </button>
        )}
      />
    </div>
  );
}
