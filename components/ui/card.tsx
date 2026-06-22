export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-[20px] border border-border bg-surface p-5 shadow-[var(--shadow-card)] ${className}`}>{children}</div>;
}
