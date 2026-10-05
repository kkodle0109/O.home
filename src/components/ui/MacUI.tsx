import Link from "next/link";
import type { ReactNode } from "react";

export function MacWindow({
  title,
  children,
  striped = true,
  className = "",
}: {
  title: string;
  children: ReactNode;
  striped?: boolean;
  className?: string;
}) {
  return (
    <section className={`mac-window ${className}`}>
      <header className={`mac-titlebar ${striped ? "" : "mac-titlebar--plain"}`}>
        {striped && <i className="mac-close" aria-hidden />}
        <span className="mac-title">{title}</span>
      </header>
      <div className="mac-body">{children}</div>
    </section>
  );
}

export function MacDialog({
  children,
  actions,
}: {
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mac-dialog" role="alertdialog">
      <svg width="32" height="32" viewBox="0 0 32 32" shapeRendering="crispEdges" aria-hidden>
        <path d="M16 3 30 29H2z" fill="#fff" stroke="#000" strokeWidth="2" />
        <path d="M15 12h2v9h-2zM15 23h2v2h-2z" fill="#000" />
      </svg>
      <div>
        <div>{children}</div>
        {actions && <div className="mac-dialog__actions">{actions}</div>}
      </div>
    </div>
  );
}

export function FolderIcon({ label, href = "#" }: { label: string; href?: string }) {
  return (
    <Link href={href} className="mac-icon">
      <svg viewBox="0 0 32 26" shapeRendering="crispEdges" aria-hidden>
        <path d="M1 5h10l3 3h17v17H1z" fill="#000" stroke="#fff" strokeWidth="2" />
      </svg>
      <span>{label}</span>
    </Link>
  );
}
