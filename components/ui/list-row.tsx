export function ListRow({ title, desc, meta }: { title: string; desc?: string; meta?: string }) {
  return (
    <div className="flex items-center gap-3 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold text-text">{title}</div>
        {desc && <div className="mt-0.5 truncate text-[13px] text-text-2">{desc}</div>}
      </div>
      {meta && <span className="shrink-0 text-[12px] text-text-3">{meta}</span>}
    </div>
  );
}
