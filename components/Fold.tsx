import type { ReactNode } from "react";

/** Collapsed plain-text section: a summary row with a hairline, content below. */
export function Fold({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <details className="fold">
      <summary>
        {title}
        {hint && <span className="muted small"> {hint}</span>}
      </summary>
      <div className="fold-body">{children}</div>
    </details>
  );
}
