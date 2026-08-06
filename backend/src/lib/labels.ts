// Human-readable labels for the enums stored in the database. Keeping the
// mapping in one place makes it trivial to rename a status everywhere,
// including matching the original design's wording.

export const ATTENTION_LABELS = {
  NEW_INFORMATION: "New information",
  CHANGE_DETECTED: "Change detected",
  REVIEW_RECOMMENDED: "Review recommended",
  TIME_SENSITIVE: "Time-sensitive",
} as const;

export const FOLLOW_UP_LABELS = {
  REVIEWED: "Reviewed",
  UNRESOLVED: "Unresolved",
  TASK_CREATED: "Task created",
  NO_ACTION_NEEDED: "No action needed",
} as const;

export const TASK_STATUS_LABELS = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  WAITING_FOR_INFORMATION: "Waiting for information",
  COMPLETED: "Completed",
} as const;

export const TASK_PRIORITY_LABELS = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
} as const;

export type AttentionKey = keyof typeof ATTENTION_LABELS;
export type FollowUpKey = keyof typeof FOLLOW_UP_LABELS;
export type TaskStatusKey = keyof typeof TASK_STATUS_LABELS;
export type TaskPriorityKey = keyof typeof TASK_PRIORITY_LABELS;

function label<T extends Record<string, string>>(map: T, key: string): string {
  return (map as Record<string, string>)[key] ?? key;
}

// The DB stores SCREAMING_SNAKE_CASE enum values; the frontend always wants
// the human-readable label. These helpers translate a row (and any nested
// rows) right before it goes out over the API, so every route returns the
// same shape and no frontend component needs to know about the raw enums.
export function serializeEvent<T extends { attention: string; followUp: string }>(e: T) {
  return { ...e, attention: label(ATTENTION_LABELS, e.attention), followUp: label(FOLLOW_UP_LABELS, e.followUp) };
}

export function serializeTask<T extends { status: string; priority: string; event?: unknown }>(t: T) {
  return {
    ...t,
    status: label(TASK_STATUS_LABELS, t.status),
    priority: label(TASK_PRIORITY_LABELS, t.priority),
    event: t.event ? serializeEvent(t.event as { attention: string; followUp: string }) : t.event,
  };
}
