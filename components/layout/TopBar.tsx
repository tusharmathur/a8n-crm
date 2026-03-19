"use client";

import { getInitials } from "@/lib/utils";

interface TopBarProps {
  title: string;
  userName?: string;
}

/** Persistent top bar with page title and user indicator. */
export function TopBar({ title, userName = "" }: TopBarProps) {
  return (
    <header className="h-14 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-6">
      <h1 className="text-base font-semibold text-[#1E293B]">{title}</h1>
      <div className="flex items-center gap-2">
        <span className="text-sm text-[#64748B]">{userName}</span>
        <div className="w-8 h-8 rounded-full bg-[#FFF7ED] flex items-center justify-center text-[#F97316] font-bold text-xs">
          {getInitials(userName)}
        </div>
      </div>
    </header>
  );
}
