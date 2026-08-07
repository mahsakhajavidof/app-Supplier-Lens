// Maps the same status/attention labels used across the app to Tailwind
// classes. One place to change if the palette ever needs to change.
export const ATTENTION_CLASSES: Record<string, string> = {
  "New information": "bg-surface-chip text-link",
  "Change detected": "bg-surface-chip text-link",
  "Review recommended": "bg-warn-bg text-warn-fg",
  "Time-sensitive": "bg-danger-bg text-danger-fg",
};

export const STATUS_CLASSES: Record<string, string> = {
  Reviewed: "bg-neutral-bg text-neutral-fg",
  Unresolved: "bg-warn-bg text-warn-fg",
  "Task created": "bg-surface-chip text-link",
  "Not started": "bg-neutral-bg text-neutral-fg",
  "In progress": "bg-surface-chip text-link",
  "Waiting for information": "bg-warn-bg text-warn-fg",
  Completed: "bg-neutral-bg text-neutral-fg",
  "No action needed": "bg-neutral-bg text-neutral-fg",
};

// Risk-indicator statuses (never an official rating) and the decision
// statuses a team member records against one — reusing the same warn/danger
// palette as the rest of the app rather than introducing new colors.
export const RISK_STATUS_CLASSES: Record<string, string> = {
  Positive: "bg-neutral-bg text-neutral-fg",
  Neutral: "bg-neutral-bg text-neutral-fg",
  Attention: "bg-warn-bg text-warn-fg",
  "High attention": "bg-danger-bg text-danger-fg",
  "Not reviewed": "bg-neutral-bg text-neutral-fg",
  Accepted: "bg-surface-chip text-link",
  "Not relevant": "bg-neutral-bg text-neutral-fg",
  Resolved: "bg-surface-chip text-link",
};

export function badgeClass(label: string): string {
  return ATTENTION_CLASSES[label] ?? STATUS_CLASSES[label] ?? RISK_STATUS_CLASSES[label] ?? "bg-neutral-bg text-neutral-fg";
}
