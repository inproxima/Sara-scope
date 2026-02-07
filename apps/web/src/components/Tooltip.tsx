"use client";

import { useId, useState, type ReactNode } from "react";

export function Tooltip({
  content,
  ariaLabel = "Show definition",
}: {
  content: ReactNode;
  ariaLabel?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <span
      className="tooltipWrap"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="tooltipTrigger"
        aria-label={ariaLabel}
        aria-describedby={open ? id : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
      >
        i
      </button>
      {open ? (
        <div id={id} role="tooltip" className="tooltipBubble">
          {content}
        </div>
      ) : null}
    </span>
  );
}

