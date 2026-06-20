import { useCallback, type ReactNode } from "react";

interface LiveSectionProps {
  title: string;
  sectionKey: string;
  collapsed: Record<string, boolean>;
  onToggle: (key: string) => void;
  children: ReactNode;
  collapsible?: boolean;
}

export default function LiveSection({
  title,
  sectionKey,
  collapsed,
  onToggle,
  children,
  collapsible = true,
}: LiveSectionProps) {
  const isCollapsed = collapsible ? (collapsed[sectionKey] ?? true) : false;
  const handleClick = useCallback(() => onToggle(sectionKey), [onToggle, sectionKey]);
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") onToggle(sectionKey);
    },
    [onToggle, sectionKey],
  );

  return (
    <div className="h-full bg-f1-bg2 border border-f1-border rounded-lg overflow-hidden">
      {collapsible ? (
        <button
          onClick={handleClick}
          type="button"
          className="w-full text-left text-xs font-semibold text-f1-bright px-4 py-3 border-b border-f1-border flex justify-between items-center cursor-pointer select-none bg-transparent border-t-0 border-x-0 font-inherit"
          onKeyDown={handleKeyDown}
        >
          <span>{title}</span>
          <span className="text-f1-dim text-[11px] hover:bg-f1-bg4 px-1.5 py-0.5 rounded transition-colors">
            {isCollapsed ? "▶" : "▼"}
          </span>
        </button>
      ) : (
        <div className="w-full text-left text-xs font-semibold text-f1-bright px-4 py-3 border-b border-f1-border flex justify-between items-center bg-transparent border-t-0 border-x-0">
          <span>{title}</span>
        </div>
      )}
      {!isCollapsed && <div className="overflow-x-auto">{children}</div>}
    </div>
  );
}
