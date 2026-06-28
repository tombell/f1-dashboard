import { useCallback } from "react";
import type { ReactNode } from "react";

import Panel from "./Panel";

interface LiveSectionProps {
  title: string;
  sectionKey: string;
  collapsed: Record<string, boolean>;
  onToggle: (key: string) => void;
  children: ReactNode;
  collapsible?: boolean;
  className?: string;
  meta?: ReactNode;
}

export default function LiveSection({
  title,
  sectionKey,
  collapsed,
  onToggle,
  children,
  className = "",
  collapsible = true,
  meta,
}: LiveSectionProps) {
  const isCollapsed = collapsible ? Boolean(collapsed[sectionKey]) : false;
  const handleToggle = useCallback(() => onToggle(sectionKey), [onToggle, sectionKey]);

  return (
    <Panel
      title={title}
      meta={meta}
      collapsed={isCollapsed}
      onToggle={collapsible ? handleToggle : undefined}
      className={className}
    >
      {children}
    </Panel>
  );
}
