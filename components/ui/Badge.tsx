"use client";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "status" | "entity" | "account-status";
  value?: string;
}

const statusColors: Record<string, string> = {
  // Account Status (Current/Past)
  Current: "bg-[#DCFCE7] text-[#166534]",
  Past: "bg-[#FEE2E2] text-[#991B1B]",
  // User Status
  Active: "bg-[#DCFCE7] text-[#166534]",
  Suspended: "bg-[#FEE2E2] text-[#991B1B]",
  // Entity Type (audit log)
  Account: "bg-[#CFFAFE] text-[#0E7490]",
  Campaign: "bg-[#EDE9FE] text-[#6D28D9]",
  Meeting: "bg-[#FEF9C3] text-[#A16207]",
};

/** Generic badge pill component. */
export function Badge({ children, value }: BadgeProps) {
  const key = value ?? (typeof children === "string" ? children : "");
  const colors = statusColors[key] ?? "bg-[#F1F5F9] text-[#64748B]";

  return (
    <span
      className={`inline-flex items-center rounded-full px-[10px] py-[2px] text-[11px] font-medium ${colors}`}
    >
      {children}
    </span>
  );
}
