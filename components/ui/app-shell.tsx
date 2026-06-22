import Link from "next/link";

export function AppShell({ unread, userInitial, children }: { unread: number; userInitial: string; children: React.ReactNode }) {
  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-20 border-b border-border bg-[color-mix(in_srgb,var(--bg)_82%,transparent)] backdrop-blur">
        <div className="mx-auto flex max-w-[760px] items-center gap-3 px-5 py-3.5">
          <Link href="/dashboard" className="flex items-center gap-2 font-extrabold text-[18px]">
            <span className="grid h-7 w-7 place-items-center rounded-[9px] bg-brand-500 text-white">터</span>터전
          </Link>
          <div className="flex-1" />
          <Link href="/notifications" className="relative grid h-10 w-10 place-items-center rounded-xl text-text-2 hover:bg-surface-2" aria-label="알림">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 9a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M10 20a2 2 0 004 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            {unread > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-warm" />}
          </Link>
          <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-500 text-[14px] font-bold text-white">{userInitial}</div>
        </div>
      </header>
      <main className="mx-auto max-w-[760px] px-5 pb-16 pt-6">{children}</main>
    </div>
  );
}
