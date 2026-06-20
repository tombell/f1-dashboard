import type { ReactNode } from "react";

interface LiveSectionProps {
  title: string;
  sectionKey: string;
  collapsed: Record<string, boolean>;
  onToggle: (key: string) => void;
  children: ReactNode;
  collapsible?: boolean;
  className?: string;
}

export default function LiveSection({ title, children, className = "" }: LiveSectionProps) {
  return (
    <div className={`bg-f1-bg2 border border-f1-border rounded-lg overflow-hidden ${className}`}>
      <div className="w-full text-left text-xs font-semibold text-f1-bright px-4 py-3 border-b border-f1-border flex justify-between items-center bg-transparent border-t-0 border-x-0">
        <span>{title}</span>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
