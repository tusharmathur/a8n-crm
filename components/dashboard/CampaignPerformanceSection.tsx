import Link from "next/link";
import { Campaign } from "@/types";
import { parseRate, avgRate } from "@/lib/utils";

interface CampaignPerformanceSectionProps {
  campaigns: Campaign[];
  accountId: string;
  readOnly?: boolean;
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-[6px] bg-[#F1F5F9] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.round(value * 100)}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs text-[#64748B] w-10 text-right flex-shrink-0">
        {value === 0 ? "0%" : `${(value * 100).toFixed(1)}%`}
      </span>
    </div>
  );
}

export function CampaignPerformanceSection({ campaigns, accountId, readOnly }: CampaignPerformanceSectionProps) {
  const totalRequestsSent = campaigns.reduce(
    (sum, c) => sum + (c.fields["Requests Sent"] ?? 0),
    0
  );
  const avgAcceptance = avgRate(campaigns.map((c) => c.fields["Acceptance Rate"]));
  const avgReply = avgRate(campaigns.map((c) => c.fields["Reply Rate"]));

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-[12px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] mb-6">
      <h3 className="text-sm font-semibold text-[#1E293B] mb-4">
        Campaigns ({campaigns.length})
      </h3>

      {campaigns.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-[#94A3B8] text-sm mb-3">No campaigns linked to this account yet.</p>
          {!readOnly && (
            <Link
              href={`/campaigns/new`}
              className="inline-flex items-center gap-1 text-sm border border-[#E2E8F0] rounded-md px-3 py-1.5 text-[#1E293B] hover:bg-[#F8FAFC]"
            >
              + New Campaign
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Aggregate stat cards */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[10px] px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium mb-1">Total Campaigns</p>
              <p className="text-[18px] font-bold text-[#1E293B]">{campaigns.length}</p>
            </div>
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[10px] px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium mb-1">Requests Sent</p>
              <p className="text-[18px] font-bold text-[#1E293B]">{totalRequestsSent}</p>
            </div>
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[10px] px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium mb-1">Avg Acceptance</p>
              <p className="text-[18px] font-bold text-[#1E293B]">{avgAcceptance}</p>
            </div>
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[10px] px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium mb-1">Avg Reply Rate</p>
              <p className="text-[18px] font-bold text-[#1E293B]">{avgReply}</p>
            </div>
          </div>

          {/* Campaign table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#F1F5F9]">
                  <th className="text-left py-2 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Campaign</th>
                  <th className="text-left py-2 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Purpose</th>
                  <th className="text-right py-2 pr-4 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Sent</th>
                  <th className="text-left py-2 pl-4 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium w-36">Acceptance Rate</th>
                  <th className="text-left py-2 pl-4 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium w-36">Reply Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {campaigns.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3 pr-4 font-semibold text-[#1E293B] whitespace-nowrap">
                      {c.fields["Campaign Name"]}
                    </td>
                    <td className="py-3 pr-4 text-[#64748B] max-w-[180px]">
                      <span className="line-clamp-1">{c.fields["Purpose"] ?? "—"}</span>
                    </td>
                    <td className="py-3 pr-4 text-[#64748B] text-right">
                      {c.fields["Requests Sent"] ?? "—"}
                    </td>
                    <td className="py-3 pl-4">
                      <ProgressBar value={parseRate(c.fields["Acceptance Rate"])} color="#F97316" />
                    </td>
                    <td className="py-3 pl-4">
                      <ProgressBar value={parseRate(c.fields["Reply Rate"])} color="#0EA5E9" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
