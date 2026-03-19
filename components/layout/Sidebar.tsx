"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import Image from "next/image";
import { getInitials } from "@/lib/utils";

interface SidebarProps {
  userName?: string;
  userEmail?: string;
}

const mainNav = [
  { icon: "📊", label: "Dashboard", href: "/dashboard" },
  { icon: "🏢", label: "Accounts", href: "/accounts" },
  { icon: "📣", label: "Campaigns", href: "/campaigns" },
  { icon: "🗓", label: "Meetings", href: "/meetings" },
];

const newRecordNav = [
  { label: "+ Account", href: "/accounts/new" },
  { label: "+ Campaign", href: "/campaigns/new" },
  { label: "+ Meeting", href: "/meetings/new" },
];

const adminNav = [
  { icon: "👥", label: "Users", href: "/admin/users" },
  { icon: "📋", label: "Audit Log", href: "/admin/audit" },
];

/** Application sidebar navigation. */
export function Sidebar({ userName = "", userEmail = "" }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/accounts" ? pathname === "/accounts" || pathname.startsWith("/accounts/") && !pathname.startsWith("/accounts/new")
      : pathname === href || pathname.startsWith(href + "/");

  const navItemClass = (href: string) =>
    isActive(href)
      ? "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold text-[#F97316] bg-[#FFF7ED] border-l-[3px] border-[#F97316]"
      : "flex items-center gap-2 px-3 py-2 rounded-md text-sm text-[#1E293B] hover:bg-[#F8FAFC] border-l-[3px] border-transparent";

  return (
    <aside className="w-[220px] min-h-screen bg-white border-r border-[#E2E8F0] flex flex-col">
      {/* Logo + App name */}
      <div className="px-4 py-4 border-b border-[#E2E8F0]">
        <Link href="/accounts" className="flex items-center gap-2">
          <Image
            src="https://www.acceler8now.com/hubfs/acceler8now_2021/images/logo.svg"
            alt="A8N"
            width={32}
            height={32}
            className="h-8 w-auto"
            unoptimized
          />
          <span className="text-sm font-bold text-[#1E293B]">A8N CRM</span>
        </Link>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {mainNav.map((item) => (
          <Link key={item.href} href={item.href} className={navItemClass(item.href)}>
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}

        {/* New Record section */}
        <div className="pt-4">
          <p className="px-3 text-[9px] uppercase tracking-widest text-[#94A3B8] font-medium mb-2">
            New Record
          </p>
          {newRecordNav.map((item) => (
            <Link key={item.href} href={item.href} className={navItemClass(item.href)}>
              {item.label}
            </Link>
          ))}
        </div>

        {/* Admin section */}
        <div className="pt-4">
          <p className="px-3 text-[9px] uppercase tracking-widest text-[#94A3B8] font-medium mb-2">
            Admin
          </p>
          {adminNav.map((item) => (
            <Link key={item.href} href={item.href} className={navItemClass(item.href)}>
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* User section */}
      <div className="px-4 py-4 border-t border-[#E2E8F0]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-[#FFF7ED] flex items-center justify-center text-[#F97316] font-bold text-xs flex-shrink-0">
            {getInitials(userName)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#1E293B] truncate">{userName}</p>
            <p className="text-xs text-[#94A3B8] truncate">{userEmail}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full text-xs text-[#64748B] hover:text-[#1E293B] text-left py-1"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
