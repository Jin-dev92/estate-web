export function StatValue({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[13px] text-text-2">{label}</div>
      <div className="mt-0.5 text-[28px] font-extrabold tracking-tight tabular-nums">{value}</div>
    </div>
  );
}
