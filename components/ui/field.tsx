import { InputHTMLAttributes } from "react";

export function Field({
  label,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <label className="block text-left">
      <span className="mb-1.5 block text-[13px] font-medium text-text-2">{label}</span>
      <input
        className="h-[50px] w-full rounded-[14px] border border-border bg-surface px-4 text-[15px] text-text outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-50"
        {...props}
      />
      {error && <span className="mt-1 block text-[13px] text-danger">{error}</span>}
    </label>
  );
}
