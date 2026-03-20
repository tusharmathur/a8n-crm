"use client";

import { formatDate } from "@/lib/utils";
import Link from "next/link";

interface ClientMeeting {
  id: string;
  fields: {
    "Attendee Name": string;
    "Attendee Company"?: string;
    "Scheduled Meeting Date"?: string;
    "Meeting Creation Date"?: string;
    "Meeting Taker"?: string;
    "Outcome / Next Steps"?: string;
  };
}

interface ClientMeetingsListProps {
  meetings: ClientMeeting[];
  accountId: string;
  token: string;
}

const dash = <span className="text-[#CBD5E1]">—</span>;

export function ClientMeetingsList({ meetings, accountId, token }: ClientMeetingsListProps) {
  const sorted = meetings
    .slice()
    .sort((a, b) => {
      const dA = a.fields["Scheduled Meeting Date"] ?? "";
      const dB = b.fields["Scheduled Meeting Date"] ?? "";
      return dB.localeCompare(dA);
    });

  if (sorted.length === 0) {
    return (
      <p className="text-[#94A3B8] text-sm text-center py-4">No meetings yet.</p>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-[#F1F5F9]">
          <th className="text-left pb-2 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Attendee</th>
          <th className="text-left pb-2 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium hidden sm:table-cell">Company</th>
          <th className="text-left pb-2 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Meeting Taker</th>
          <th className="text-left pb-2 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Scheduled</th>
          <th className="text-left pb-2 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium hidden sm:table-cell">Created</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((m, i, arr) => (
          <tr key={m.id} className={i < arr.length - 1 ? "border-b border-[#F1F5F9]" : ""}>
            <td className="py-3 pr-3">
              <Link
                href={`/client/${accountId}/meetings/${m.id}?token=${token}`}
                className="font-semibold text-[#6B21A8] hover:underline truncate block max-w-[160px]"
              >
                {m.fields["Attendee Name"]}
              </Link>
            </td>
            <td className="py-3 pr-3 text-[#1E1B4B] truncate max-w-[120px] hidden sm:table-cell">
              {m.fields["Attendee Company"] ?? dash}
            </td>
            <td className="py-3 pr-3 text-[#1E1B4B] truncate max-w-[120px]">
              {m.fields["Meeting Taker"] ?? dash}
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
  );
}
