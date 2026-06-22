type Tone = "success" | "neutral" | "warning";
const tones: Record<Tone, string> = {
  success: "bg-brand-50 text-brand-600",
  neutral: "bg-surface-2 text-text-2",
  warning: "bg-[var(--warning-bg)] text-warning",
};
export function Chip({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-bold ${tones[tone]}`}>{children}</span>;
}
