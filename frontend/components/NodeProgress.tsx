"use client";

import { CheckCircle2, Loader2 } from "lucide-react";

interface NodeProgressProps {
  currentNode: string;
  currentLabel: string;
}

const STEPS = [
  { node: "classify", label: "Analyzing" },
  { node: "retrieve", label: "Retrieving" },
  { node: "web_search", label: "Searching" },
  { node: "generate", label: "Generating" },
];

// Which steps are relevant given the current node
function getVisibleSteps(currentNode: string) {
  if (currentNode === "retrieve") {
    return [STEPS[0], STEPS[1], STEPS[3]];
  }
  if (currentNode === "web_search") {
    return [STEPS[0], STEPS[2], STEPS[3]];
  }
  if (currentNode === "generate") {
    // Show only generate unless we passed through a middle step
    return [STEPS[0], STEPS[3]];
  }
  // classify only
  return [STEPS[0]];
}

function getStepStatus(
  step: { node: string },
  currentNode: string,
): "done" | "active" | "pending" {
  const order = ["classify", "retrieve", "web_search", "generate"];
  const currentIdx = order.indexOf(currentNode);
  const stepIdx = order.indexOf(step.node);
  if (stepIdx < currentIdx) return "done";
  if (stepIdx === currentIdx) return "active";
  return "pending";
}

export function NodeProgress({ currentNode, currentLabel }: NodeProgressProps) {
  const steps = getVisibleSteps(currentNode);

  return (
    <div className="flex items-center gap-2 py-1 animate-fade-in">
      {steps.map((step, i) => {
        const status = getStepStatus(step, currentNode);
        return (
          <div key={step.node} className="flex items-center gap-2">
            {/* Step pill */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                status === "active"
                  ? "bg-accent/15 text-accent border border-accent/30"
                  : status === "done"
                    ? "bg-surface-2 text-muted border border-border"
                    : "bg-surface-2 text-muted/40 border border-border/50"
              }`}
            >
              {status === "done" ? (
                <CheckCircle2 size={11} className="text-accent/60" />
              ) : status === "active" ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <span className="w-2 h-2 rounded-full border border-current" />
              )}
              {status === "active" ? currentLabel.replace("…", "") : step.label}
            </div>

            {/* Connector */}
            {i < steps.length - 1 && (
              <div
                className={`w-4 h-px transition-colors ${
                  status === "done" ? "bg-accent/30" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
