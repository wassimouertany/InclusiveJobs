import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

export default function Button({ variant = "primary", className = "", children, ...props }: ButtonProps) {
  const variantClass =
    variant === "primary" ? "bo-btn-primary" : variant === "danger" ? "bo-btn-danger" : "bo-btn-ghost";
  return (
    <button type="button" className={`bo-btn ${variantClass} ${className}`} {...props}>
      {children}
    </button>
  );
}
