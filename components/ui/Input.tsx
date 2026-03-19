"use client";

import { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

const inputClass =
  "w-full border border-[#CBD5E1] rounded-[8px] px-3 py-[9px] text-sm text-[#1E293B] bg-white focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#FED7AA] placeholder:text-[#94A3B8]";

/** Styled text input. */
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

/** Styled select dropdown. */
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${inputClass} ${props.className ?? ""}`} />
  );
}

/** Styled textarea. */
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`${inputClass} resize-none ${props.className ?? ""}`}
    />
  );
}

/** Form field label. */
export function Label({
  children,
  required,
  htmlFor,
}: {
  children: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-[11px] uppercase tracking-wide text-[#64748B] font-semibold mb-1"
    >
      {children}
      {required && <span className="text-[#F97316] ml-0.5">*</span>}
    </label>
  );
}
