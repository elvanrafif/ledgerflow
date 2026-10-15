/**
 * LoadingState. Announces that work is in progress to assistive tech
 * (aria-busy + a live region) while showing a visible spinner for sighted users.
 */
export interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = "Loading" }: LoadingStateProps) {
  return (
    <div className="state" role="status" aria-live="polite" aria-busy="true">
      <span className="spinner" aria-hidden="true" />
      <p className="state__body">{label}</p>
    </div>
  );
}
