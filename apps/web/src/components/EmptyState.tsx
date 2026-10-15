import type { ReactNode } from "react";

/**
 * EmptyState. The plan is explicit: an empty state says why it is empty and what
 * to do next. `title` names the situation, `body` names the next action, and an
 * optional action slot carries the control that does it.
 */
export interface EmptyStateProps {
  title: string;
  body?: string;
  action?: ReactNode;
}

export function EmptyState({ title, body, action }: EmptyStateProps) {
  return (
    <div className="state" role="status">
      <p className="state__title">{title}</p>
      {body ? <p className="state__body">{body}</p> : null}
      {action}
    </div>
  );
}
