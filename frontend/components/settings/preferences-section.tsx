"use client";

import { Lightbulb, SlidersHorizontal } from "lucide-react";
import { useWorkspace } from "@/components/app/workspace-provider";
import { ModelPicker } from "@/components/chat/model-picker";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/misc";

export function PreferencesSection() {
  const { preferences, updatePreferences, think, setThink, catalog, useMemory } = useWorkspace();
  const set = (changes: Parameters<typeof updatePreferences>[0]) =>
    updatePreferences(changes).catch(() => {});
  return (
    <>
      <Card>
        <CardHeader
          title="Default Model"
          description="The model new messages use. You can switch any time from the chat box."
          icon={<SlidersHorizontal className="size-5" />}
        />
        <CardBody>
          <div className="border-border bg-bg-subtle flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-fg-2 text-sm">Current model</p>
            <ModelPicker />
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader
          title="Chat Behaviour"
          description="Fine-tune how Nexus responds."
          icon={<Lightbulb className="size-5" />}
        />
        <CardBody className="divide-border divide-y">
          <Switch
            label="Think Mode"
            description={`Weigh options before answering, using ${catalog?.think.engine ?? "a reasoning model"}. Slower, but better for decisions.`}
            checked={think}
            onChange={setThink}
          />
          <Switch
            label="Use Memory in Replies"
            description="Let Nexus use the chats you've saved to memory as background context."
            checked={useMemory}
            onChange={(value) => set({ use_memory: value })}
          />
          <Switch
            label="Press Enter to Send"
            description="Turn off to use Enter for new lines and Ctrl + Enter to send."
            checked={preferences.enter_to_send !== false}
            onChange={(value) => set({ enter_to_send: value })}
          />
          <Switch
            label="Show Reply Details"
            description="Show the model, response time and token count under each reply."
            checked={preferences.show_stats !== false}
            onChange={(value) => set({ show_stats: value })}
          />
        </CardBody>
      </Card>
    </>
  );
}
