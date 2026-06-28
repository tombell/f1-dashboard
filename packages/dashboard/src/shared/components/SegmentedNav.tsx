import type { ReactNode } from "react";

export interface SegmentedNavItem<T extends string> {
  value: T;
  label: ReactNode;
  href?: string;
  onClick?: () => void;
}

interface SegmentedNavProps<T extends string> {
  items: SegmentedNavItem<T>[];
  active: T;
  ariaLabel: string;
}

const baseClass =
  "inline-flex min-h-7 items-center justify-center rounded-md border border-transparent px-3 py-1 text-[11px] font-semibold leading-none transition-colors";
const activeClass = "bg-f1-red text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]";
const inactiveClass = "bg-f1-bg3 text-f1-dim hover:bg-f1-bg4 hover:text-f1-bright";

export default function SegmentedNav<T extends string>({
  items,
  active,
  ariaLabel,
}: SegmentedNavProps<T>) {
  return (
    <nav aria-label={ariaLabel} className="flex flex-wrap gap-1.5">
      {items.map((item) => {
        const className = `${baseClass} ${item.value === active ? activeClass : inactiveClass}`;
        if (item.href) {
          return (
            <a key={item.value} href={item.href} className={className}>
              {item.label}
            </a>
          );
        }
        return (
          <button key={item.value} type="button" onClick={item.onClick} className={className}>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
