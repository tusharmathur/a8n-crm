"use client";

import { useState } from "react";
import { MeetingsChart } from "./MeetingsChart";
import { CampaignPerformanceSection } from "./CampaignPerformanceSection";
import { getMeetingTitle, formatDate, groupMeetingsByMonth } from "@/lib/utils";
import { Account, Meeting, Campaign } from "@/types";
import { Select, Label } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

interface GlobalDashboardClientProps {
  accounts: Account[];
  initialMeetings: Meeting[];
  initialCampaigns: Campaign[];
}

/** Global dashboard with optional account filter and meeting charts. */
export function GlobalDashboardClient({ accounts, initialMeetings, initialCampaigns }: GlobalDashboardClientProps) {
  const [selectedAccountId, setSelectedAccountId] = useState("");

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  const meetings = selectedAccountId
    ? initialMeetings.filter((m) => m.fields["Account"]?.includes(selectedAccountId))
    : initialMeetings;

  const campaigns = selectedAccountId
    ? initialCampaigns.filter((c) => c.fields["Account"]?.includes(selectedAccountId))
    : initialCampaigns;

  const chartData = groupMeetingsByMonth(
    meetings.map((m) => ({ scheduledDate: m.fields["Meeting Creation Date"] }))
  );

  const sorted = meetings.slice().sort((a, b) => {
    const dA = a.fields["Meeting Creation Date"] ?? "";
    const dB = b.fields["Meeting Creation Date"] ?? "";
    return dB.localeCompare(dA);
  });

  return (
    <div>
      {/* Account filter */}
      <div className="mb-6 max-w-sm">
        <Label htmlFor="accountSelect">Filter by Account</Label>
        <Select
          id="accountSelect"
          value={selectedAccountId}
          onChange={(e) => setSelectedAccountId(e.target.value)}
        >
          <option value="">All accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.fields["Name"]}
            </option>
          ))}
        </Select>
      </div>

      {/* Account mini-card (only when filtered) */}
      {selectedAccount && (
        <div className="bg-white border border-[#E2E8F0] rounded-[12px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] mb-6 flex items-center gap-3">
          <div>
            <p className="font-semibold text-[#1E1B4B]">{selectedAccount.fields["Name"]}</p>
            <p className="text-sm text-[#64748B]">{selectedAccount.fields["Address"] ?? ""}</p>
          </div>
          {selectedAccount.fields["Status"] && (
            <div className="ml-auto">
              <Badge value={selectedAccount.fields["Status"]}>
                {selectedAccount.fields["Status"]}
              </Badge>
            </div>
          )}
        </div>
      )}

      {/* Campaign performance */}
      <CampaignPerformanceSection campaigns={campaigns} accountId={selectedAccountId} />

      {/* Chart */}
      <div className="bg-white border border-[#E2E8F0] rounded-[12px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] mb-6">
        <h3 className="text-sm font-semibold text-[#1E1B4B] mb-4">Meetings per Month</h3>
        <MeetingsChart data={chartData} />
      </div>

      {/* Meetings list */}
      <div className="bg-white border border-[#E2E8F0] rounded-[12px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <h3 className="text-sm font-semibold text-[#1E1B4B] mb-4">
          All Meetings ({meetings.length})
        </h3>
        {sorted.length === 0 ? (
          <p className="text-[#94A3B8] text-sm text-center py-4">No meetings yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#F1F5F9]">
                <th className="text-left pb-2 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Attendee</th>
                <th className="text-left pb-2 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Company</th>
                <th className="text-left pb-2 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Meeting Taker</th>
                <th className="text-left pb-2 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Scheduled</th>
                <th className="text-left pb-2 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium hidden sm:table-cell">Created</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((m, i, arr) => (
                <tr key={m.id} className={i < arr.length - 1 ? "border-b border-[#F1F5F9]" : ""}>
                  <td className="py-3 pr-3">
                    <Link href={`/meetings/${m.id}`} className="font-semibold text-[#6B21A8] hover:underline truncate block max-w-[160px]">
                      {m.fields["Attendee Name"]}
                    </Link>
                  </td>
                  <td className="py-3 pr-3 text-[#1E1B4B] truncate max-w-[120px]">
                    {m.fields["Attendee Company"] ?? <span className="text-[#CBD5E1]">—</span>}
                  </td>
                  <td className="py-3 pr-3 text-[#1E1B4B] truncate max-w-[120px]">
                    {m.fields["Meeting Taker"] ?? <span className="text-[#CBD5E1]">—</span>}
                  </td>
                  <td className="py-3 pr-3 text-[#64748B] whitespace-nowrap">
                    {formatDate(m.fields["Scheduled Meeting Date"])}
                  </td>
                  <td className="py-3 text-[#64748B] whitespace-nowrap hidden sm:table-cell">
                    {formatDate(m.fields["Meeting Creation Date"])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
