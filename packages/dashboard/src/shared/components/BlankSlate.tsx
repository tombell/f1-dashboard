import type { ReactNode } from "react";

interface BlankSlateProps {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}

export default function BlankSlate({ icon = "🏁", title, children, action }: BlankSlateProps) {
  return (
    <section className="flex flex-1 min-h-[320px] items-center justify-center rounded-lg border border-f1-border bg-f1-bg2 px-6 py-12 text-center">
      <div className="max-w-lg">
        <div className="mb-4 text-4xl" aria-hidden="true">
          {icon}
        </div>
        <h2 className="text-lg font-bold text-f1-bright">{title}</h2>
        {children && <div className="mt-3 text-sm leading-6 text-f1-dim">{children}</div>}
        {action && <div className="mt-5 flex justify-center">{action}</div>}
      </div>
    </section>
  );
}
