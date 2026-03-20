"use client";

import { ButtonHTMLAttributes } from "react";
import { Spinner } from "./Spinner";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
  loadingText?: string;
}

/** Branded button component. */
export function Button({
  variant = "primary",
  loading = false,
  loadingText = "Saving…",
  children,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-[#6B21A8] text-white hover:bg-[#7C3AED] focus:ring-[#DDD6FE]",
    secondary:
      "bg-white border border-[#E2E8F0] text-[#1E1B4B] hover:bg-[#F8FAFC] focus:ring-[#E2E8F0]",
    danger: "bg-[#EF4444] text-white hover:bg-[#DC2626] focus:ring-[#FCA5A5]",
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {loading ? (
        <>
          <Spinner size="sm" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}
