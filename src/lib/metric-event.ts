export type ToolMetricEvent = {
  id: string;
  toolId: string;
  metric: "view" | "click";
  occurredAt: string;
};

const identifier = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

export function isToolMetricEvent(value: unknown): value is ToolMetricEvent {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const event = value as Record<string, unknown>;
  if (typeof event.id !== "string" || !identifier.test(event.id)) return false;
  if (typeof event.toolId !== "string" || !identifier.test(event.toolId)) return false;
  if (event.metric !== "view" && event.metric !== "click") return false;
  if (typeof event.occurredAt !== "string" || event.occurredAt.length !== 24) return false;
  const timestamp = Date.parse(event.occurredAt);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === event.occurredAt;
}

// Validation deliberately has no age limit: a valid event can wait in the durable
// queue for seven days. Apply any browser-input age limit before publishing.
export function parseToolMetricEvent(value: unknown): ToolMetricEvent {
  if (!isToolMetricEvent(value)) throw new TypeError("Invalid tool metric event");
  return { id: value.id, toolId: value.toolId, metric: value.metric, occurredAt: value.occurredAt };
}
