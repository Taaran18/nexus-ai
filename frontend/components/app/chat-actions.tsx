"use client";

import {
  Brain,
  BrainCog,
  Download,
  FolderInput,
  FolderMinus,
  FolderPlus,
  Palette,
  Pencil,
  Trash2,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useWorkspace } from "@/components/app/workspace-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import type { MenuItem } from "@/components/ui/menu";
import { Select } from "@/components/ui/select";
import { ApiError } from "@/lib/api/client";
import { chatApi } from "@/lib/api/endpoints";
import type { ChatSummary, Folder } from "@/lib/types";
import { cn } from "@/lib/utils";

export const FOLDER_COLORS = [
  { value: "#0D9488", name: "Teal" },
  { value: "#2563EB", name: "Blue" },
  { value: "#16A34A", name: "Green" },
  { value: "#D97706", name: "Amber" },
  { value: "#DC2626", name: "Red" },
  { value: "#DB2777", name: "Pink" },
  { value: "#0891B2", name: "Cyan" },
  { value: "#64748B", name: "Slate" },
];

type DialogState =
  | { kind: "rename"; chat: ChatSummary }
  | { kind: "move"; chat: ChatSummary }
  | { kind: "delete"; chat: ChatSummary }
  | { kind: "memory-full"; chat: ChatSummary }
  | { kind: "folder"; folder?: Folder; assignChat?: ChatSummary }
  | { kind: "delete-folder"; folder: Folder }
  | null;

interface ChatActionsValue {
  chatMenu: (chat: ChatSummary) => MenuItem[];
  folderMenu: (folder: Folder) => MenuItem[];
  newFolder: () => void;
  confirmDeleteChat: (chat: ChatSummary) => void;
}

const ChatActionsContext = createContext<ChatActionsValue | null>(null);

export function ChatActionsProvider({ children }: { children: React.ReactNode }) {
  const workspace = useWorkspace();
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [dialog, setDialog] = useState<DialogState>(null);
  const close = useCallback(() => setDialog(null), []);

  const exportChat = useCallback(
    async (chat: ChatSummary) => {
      try {
        await chatApi.exportMarkdown(chat.id);
        toast.success("Export Started", "Your chat is downloading as a Markdown file.");
      } catch (error) {
        toast.error(
          "Couldn't Export the Chat",
          error instanceof ApiError ? error.message : undefined,
        );
      }
    },
    [toast],
  );

  const toggleMemory = useCallback(
    async (chat: ChatSummary) => {
      if (chat.in_memory) {
        await workspace.removeMemory(chat.id).catch(() => {});
        return;
      }
      if (workspace.memory.items.length >= workspace.memory.limit) {
        setDialog({ kind: "memory-full", chat });
        return;
      }
      await workspace.saveMemory(chat.id);
    },
    [workspace],
  );

  const chatMenu = useCallback(
    (chat: ChatSummary): MenuItem[] => [
      {
        label: "Rename",
        icon: <Pencil className="size-4" />,
        onSelect: () => setDialog({ kind: "rename", chat }),
      },
      {
        label: "Move to Folder",
        icon: <FolderInput className="size-4" />,
        onSelect: () => setDialog({ kind: "move", chat }),
      },
      ...(chat.folder_id
        ? [
            {
              label: "Remove From Folder",
              icon: <FolderMinus className="size-4" />,
              onSelect: () => workspace.moveChat(chat.id, null).catch(() => {}),
            },
          ]
        : []),
      {
        label: chat.in_memory ? "Remove From Memory" : "Save to Memory",
        icon: chat.in_memory ? <BrainCog className="size-4" /> : <Brain className="size-4" />,
        onSelect: () => toggleMemory(chat),
      },
      {
        label: "Export as Markdown",
        icon: <Download className="size-4" />,
        onSelect: () => exportChat(chat),
      },
      { separator: true },
      {
        label: "Delete Chat",
        icon: <Trash2 className="size-4" />,
        danger: true,
        onSelect: () => setDialog({ kind: "delete", chat }),
      },
    ],
    [exportChat, toggleMemory, workspace],
  );

  const folderMenu = useCallback(
    (folder: Folder): MenuItem[] => [
      {
        label: "Edit Folder",
        icon: <Palette className="size-4" />,
        onSelect: () => setDialog({ kind: "folder", folder }),
      },
      { separator: true },
      {
        label: "Delete Folder",
        icon: <Trash2 className="size-4" />,
        danger: true,
        onSelect: () => setDialog({ kind: "delete-folder", folder }),
      },
    ],
    [],
  );

  const value = useMemo<ChatActionsValue>(
    () => ({
      chatMenu,
      folderMenu,
      newFolder: () => setDialog({ kind: "folder" }),
      confirmDeleteChat: (chat) => setDialog({ kind: "delete", chat }),
    }),
    [chatMenu, folderMenu],
  );

  const activeChatId = pathname === "/" ? params.get("c") : null;

  return (
    <ChatActionsContext.Provider value={value}>
      {children}
      {dialog?.kind === "rename" && (
        <RenameDialog
          chat={dialog.chat}
          onClose={close}
          onSave={(title) => workspace.renameChat(dialog.chat.id, title)}
        />
      )}
      {dialog?.kind === "move" && (
        <MoveDialog
          chat={dialog.chat}
          folders={workspace.folders}
          onClose={close}
          onMove={(folderId) => workspace.moveChat(dialog.chat.id, folderId)}
          onNewFolder={() => setDialog({ kind: "folder", assignChat: dialog.chat })}
        />
      )}
      <ConfirmDialog
        open={dialog?.kind === "delete"}
        onClose={close}
        title="Delete This Chat?"
        description={
          dialog?.kind === "delete" ? (
            <>
              <strong className="text-fg">“{dialog.chat.title}”</strong> and all of its messages
              will be permanently deleted
              {dialog.chat.in_memory ? ", and it will be removed from memory" : ""}. This can&apos;t
              be undone.
            </>
          ) : null
        }
        confirmLabel="Delete Chat"
        onConfirm={async () => {
          if (dialog?.kind !== "delete") return;
          const id = dialog.chat.id;
          await workspace.deleteChat(id);
          if (activeChatId === id) router.replace("/");
        }}
      />
      <ConfirmDialog
        open={dialog?.kind === "memory-full"}
        onClose={close}
        tone="default"
        title="Memory Is Full"
        description={`You can save up to ${workspace.memory.limit} chats to memory. Remove one in Settings → Memory, then save this chat again.`}
        confirmLabel="Manage Memory"
        cancelLabel="Not Now"
        onConfirm={() => router.push("/settings?tab=memory")}
      />
      {dialog?.kind === "folder" && (
        <FolderDialog
          folder={dialog.folder}
          onClose={close}
          onSave={async (name, color) => {
            if (dialog.folder) {
              await workspace.updateFolder(dialog.folder.id, { name, color });
            } else {
              const folder = await workspace.createFolder(name, color);
              if (folder && dialog.assignChat)
                await workspace.moveChat(dialog.assignChat.id, folder.id);
            }
          }}
        />
      )}
      <ConfirmDialog
        open={dialog?.kind === "delete-folder"}
        onClose={close}
        title="Delete This Folder?"
        description={
          dialog?.kind === "delete-folder" ? (
            <>
              The folder <strong className="text-fg">“{dialog.folder.name}”</strong> will be
              deleted. Chats inside it won&apos;t be deleted. They&apos;ll move back to your recent
              list.
            </>
          ) : null
        }
        confirmLabel="Delete Folder"
        onConfirm={async () => {
          if (dialog?.kind === "delete-folder") await workspace.deleteFolder(dialog.folder.id);
        }}
      />
    </ChatActionsContext.Provider>
  );
}

export function useChatActions() {
  const context = useContext(ChatActionsContext);
  if (!context) throw new Error("useChatActions must be used inside ChatActionsProvider");
  return context;
}

function RenameDialog({
  chat,
  onClose,
  onSave,
}: {
  chat: ChatSummary;
  onClose: () => void;
  onSave: (title: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(chat.title);
  const [busy, setBusy] = useState(false);
  const trimmed = title.trim();
  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!trimmed || trimmed === chat.title) return onClose();
    setBusy(true);
    try {
      await onSave(trimmed);
      onClose();
    } catch {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open
      onClose={onClose}
      title="Rename Chat"
      description="Give this chat a name you'll recognise later."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => submit()} loading={busy} disabled={!trimmed}>
            Save Name
          </Button>
        </>
      }
    >
      <form onSubmit={submit}>
        <Field label="Chat Name">
          {(props) => (
            <Input
              {...props}
              data-autofocus
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onFocus={(e) => e.target.select()}
            />
          )}
        </Field>
      </form>
    </Dialog>
  );
}

function MoveDialog({
  chat,
  folders,
  onClose,
  onMove,
  onNewFolder,
}: {
  chat: ChatSummary;
  folders: Folder[];
  onClose: () => void;
  onMove: (folderId: string | null) => Promise<void>;
  onNewFolder: () => void;
}) {
  const [folderId, setFolderId] = useState<string>(chat.folder_id ?? "none");
  const [busy, setBusy] = useState(false);
  const options = [
    { value: "none", label: "No Folder", description: "Show this chat in your recent list" },
    ...folders.map((f) => ({
      value: f.id,
      label: f.name,
      icon: <span className="block size-3 rounded-full" style={{ backgroundColor: f.color }} />,
    })),
  ];
  const submit = async () => {
    const target = folderId === "none" ? null : folderId;
    if (target === chat.folder_id) return onClose();
    setBusy(true);
    try {
      await onMove(target);
      onClose();
    } catch {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open
      onClose={onClose}
      title="Move to Folder"
      description={`Choose where “${chat.title}” should live.`}
      footer={
        <>
          <Button variant="ghost" onClick={onNewFolder} className="sm:mr-auto">
            <FolderPlus className="size-4" />
            New Folder
          </Button>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} loading={busy}>
            Move Chat
          </Button>
        </>
      }
    >
      <Field label="Folder">
        {(props) => (
          <Select
            id={props.id}
            ariaLabel="Folder"
            value={folderId}
            onChange={setFolderId}
            options={options}
          />
        )}
      </Field>
    </Dialog>
  );
}

function FolderDialog({
  folder,
  onClose,
  onSave,
}: {
  folder?: Folder;
  onClose: () => void;
  onSave: (name: string, color: string) => Promise<void>;
}) {
  const [name, setName] = useState(folder?.name ?? "");
  const [color, setColor] = useState(folder?.color ?? FOLDER_COLORS[0].value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await onSave(name.trim(), color);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : null);
      setBusy(false);
    }
  };
  return (
    <Dialog
      open
      onClose={onClose}
      title={folder ? "Edit Folder" : "New Folder"}
      description={folder ? "Change the folder's name or colour." : "Group related chats together."}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => submit()} loading={busy} disabled={!name.trim()}>
            {folder ? "Save Changes" : "Create Folder"}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5">
        <Field label="Folder Name" error={error}>
          {(props) => (
            <Input
              {...props}
              data-autofocus
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Work, Research, Travel…"
            />
          )}
        </Field>
        <fieldset>
          <legend className="text-sm font-semibold text-fg">Colour</legend>
          <div className="mt-2.5 flex flex-wrap gap-2.5">
            {FOLDER_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                aria-label={c.name}
                aria-pressed={color === c.value}
                className={cn(
                  "size-9 rounded-xl ring-offset-2 ring-offset-surface transition-transform hover:scale-110",
                  color === c.value && "ring-2 ring-fg",
                )}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
        </fieldset>
      </form>
    </Dialog>
  );
}
