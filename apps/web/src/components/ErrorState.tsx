import type { ReactNode } from "react";

/**
 * ErrorState. Surfaces a failed request with a human message and an optional
 * retry control. The API's own message is passed through by the caller; this
 * component adds the presentation and the alert role.
 */
export interface ErrorStateProps {
  title?: string;
  message: string;
  action?: ReactNode;
}

export function ErrorState({ title = "Something went wrong", message, action }: ErrorStateProps) {
  return (
    <div className="state state--error" role="alert">
      <p className="state__title">{title}</p>
      <p className="state__body">{message}</p>
      {action}
    </div>
  );
}
