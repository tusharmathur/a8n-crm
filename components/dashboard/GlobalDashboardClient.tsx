"use client";

import { useState } from "react";
import { MeetingsChart } from "./MeetingsChart";
import { getMeetingTitle, formatDate, groupMeetingsByMonth } from "@/lib/utils";
import { Account, Meeting } from "@/types";
import { Select, Label } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";

interface GlobalDashboardClientProps {
  accounts: Account[];
}

/** Global dashboard with account selector and meeting charts. */
export function GlobalDashboardClient({ accounts }: GlobalDashboardClientProps) {
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(false);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  const handleAccountChange = async (id: string) => {
    setSelectedAccountId(id);
    if (!id) {
      setMeetings([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/meetings?accountId=${id}`);
      if (res.ok) {
        const data = await res.json();
        setMeetings(data);
      }
    } finally {
      setLoading(false);
    }
  };

  const chartData = groupMeetingsByMonth(
    meetings.map((m) => ({ scheduledDate: m.fields["Scheduled Meeting Date"] }))
  );

  return (
    <div>
      <div className="mb-6 max-w-sm">
        <Label htmlFor="accountSelect">Select Account</Label>
        <Select
          id="accountSelect"
          value={selectedAccountId}
          onChange={(e) => handleAccountChange(e.target.value)}
        >
          <option value="">Select an account…</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.fields["Name"]}
            </option>
          ))}
        </Select>
      </div>

      {!selectedAccountId && (
        <div className="mt-16 text-center text-[#94A3B8]">
          <div className="text-4xl mb-3">📊</div>
          <p>Select an account above to view its dashboard</p>
        </div>
      )}

      {selectedAccountId && loading && (
        <div className="flex justify-center mt-10">
          <Spinner size="lg" />
        </div>
      )}

      {selectedAccountId && !loading && selectedAccount && (
        <>
          {/* Account mini-card */}
          <div className="bg-white border border-[#E2E8F0] rounded-[12px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] mb-6 flex items-center gap-3">
            <div>
              <p className="font-semibold text-[#1E293B]">{selectedAccount.fields["Name"]}</p>
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

          {/* Chart */}
          <div className="bg-white border border-[#E2E8F0] rounded-[12px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] mb-6">
            <h3 className="text-sm font-semibold text-[#1E293B] mb-4">Meetings per Month</h3>
            <MeetingsChart data={chartData} />
          </div>

          {/* Meetings list */}
          <div className="bg-white border border-[#E2E8F0] rounded-[12px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <h3 className="text-sm font-semibold text-[#1E293B] mb-4">
              All Meetings ({meetings.length})
            </h3>
            {meetings.length === 0 ? (
              <p className="text-[#94A3B8] text-sm text-center py-4">No meetings yet.</p>
            ) : (
              <div className="divide-y divide-[#F1F5F9]">
                {meetings
                  .slice()
                  .sort((a, b) => {
                    const dA = a.fields["Scheduled Meeting Date"] ?? "";
                    const dB = b.fields["Scheduled Meeting Date"] ?? "";
                    return dB.localeCompare(dA);
                  })
                  .map((m) => {
                    const title = getMeetingTitle({
                      accountName: m.accountName,
                      meetingTaker: m.fields["Meeting Taker"],
                      attendeeName: m.fields["Attendee Name"],
                      attendeeCompany: m.fields["Attendee Company"],
                    });
                    return (
                      <div key={m.id} className="py-3 flex items-start justify-between gap-4">
                        <p className="font-semibold text-sm text-[#1E293B] truncate">{title}</p>
                        <span className="text-xs bg-[#F1F5F9] text-[#64748B] rounded-full px-2 py-1 flex-shrink-0">
                          {formatDate(m.fields["Scheduled Meeting Date"])}
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
