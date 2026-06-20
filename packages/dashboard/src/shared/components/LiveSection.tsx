import { useCallback, type ReactNode } from "react";

interface LiveSectionProps {
  title: string;
  sectionKey: string;
  collapsed: Record<string, boolean>;
  onToggle: (key: string) => void;
  children: ReactNode;
}

export default function LiveSection({
  title,
  sectionKey,
  collapsed,
  onToggle,
  children,
}: LiveSectionProps) {
  const isCollapsed = collapsed[sectionKey] ?? true;
  const handleClick = useCallback(() => onToggle(sectionKey), [onToggle, sectionKey]);
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") onToggle(sectionKey);
    },
    [onToggle, sectionKey],
  );

  return (
    <div className="bg-f1-bg2 border border-f1-border rounded-lg overflow-hidden">
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
      {!isCollapsed && <div className="overflow-x-auto">{children}</div>}
    </div>
  );
}
