import { ATTENTION_LABELS, FOLLOW_UP_LABELS, serializeEvent, serializeTask } from "./labels.js";

export function decorateSubcontractor<
  T extends {
    events: { attention: string; followUp: string; type: string; reviewed: boolean }[];
    tasks?: { status: string; priority: string; event?: unknown }[];
  }
>(subcontractor: T) {
  const latest = subcontractor.events[0];
  return {
    ...subcontractor,
    latestChange: latest?.type ?? "No changes detected",
    attention: latest ? ATTENTION_LABELS[latest.attention as keyof typeof ATTENTION_LABELS] : "New information",
    status: latest ? FOLLOW_UP_LABELS[latest.followUp as keyof typeof FOLLOW_UP_LABELS] : "No action needed",
    newEventsCount: subcontractor.events.filter((event) => !event.reviewed).length,
    events: subcontractor.events.map(serializeEvent),
    tasks: subcontractor.tasks?.map(serializeTask),
  };
}
