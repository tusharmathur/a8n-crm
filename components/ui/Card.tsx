interface CardProps {
  children: React.ReactNode;
  className?: string;
}

/** White card container with standard shadow and border. */
export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`bg-white border border-[#E2E8F0] rounded-[12px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] ${className}`}
    >
      {children}
    </div>
  );
}

/** Smaller stat card with light gray background. */
export function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[10px] px-5 py-4">
      <p className="text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium mb-1">
        {label}
      </p>
      <p className="text-[20px] font-bold text-[#1E293B]">{value}</p>
    </div>
  );
}
