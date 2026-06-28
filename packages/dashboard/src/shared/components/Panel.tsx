import type { ReactNode } from "react";

import { ChevronIcon } from "./icons";

interface PanelProps {
  title?: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  collapsed?: boolean;
  onToggle?: () => void;
}

export default function Panel({
  title,
  meta,
  children,
  className = "",
  bodyClassName = "overflow-x-auto",
  collapsed = false,
  onToggle,
}: PanelProps) {
  const hasHeader = title || meta || onToggle;

  return (
    <section
      className={`min-w-0 overflow-hidden rounded-lg border border-f1-border bg-f1-bg2 ${className}`}
    >
      {hasHeader &&
        (onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            className="flex w-full items-center justify-between gap-3 border-x-0 border-t-0 border-b border-f1-border bg-f1-bg3/80 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-f1-dim transition-colors hover:bg-f1-bg3"
          >
            <span className="min-w-0 truncate text-f1-bright">{title}</span>
            <span className="flex items-center gap-2 text-[10px] font-normal tracking-normal text-f1-dim">
              {meta}
              <ChevronIcon
                className={`h-3 w-3 transition-transform ${collapsed ? "-rotate-90" : ""}`}
              />
            </span>
          </button>
        ) : (
          <div className="flex items-center justify-between gap-3 border-b border-f1-border bg-f1-bg3/80 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-f1-dim">
            <span className="min-w-0 truncate text-f1-bright">{title}</span>
            {meta && (
              <span className="text-[10px] font-normal tracking-normal text-f1-dim">{meta}</span>
            )}
          </div>
        ))}
      {!collapsed && <div className={bodyClassName}>{children}</div>}
    </section>
  );
}
