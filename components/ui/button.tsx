import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
const styles: Record<Variant, string> = {
  primary: "bg-brand-500 text-white hover:bg-brand-600",
  secondary: "bg-surface-2 text-text hover:brightness-95",
  ghost: "bg-transparent text-text hover:bg-surface-2",
  danger: "bg-danger text-white hover:brightness-95",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`h-[50px] w-full rounded-[14px] font-bold text-[15px] grid place-items-center transition active:scale-[.985] disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
