"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

interface ClientMeeting {
  id: string;
  fields: {
    "Attendee Name": string;
    "Scheduled Meeting Date"?: string;
    "Outcome / Next Steps"?: string;
  };
}

interface ClientMeetingsListProps {
  meetings: ClientMeeting[];
}

function MeetingRow({ meeting }: { meeting: ClientMeeting }) {
  const [expanded, setExpanded] = useState(false);
  const outcome = meeting.fields["Outcome / Next Steps"];

  return (
    <div className="py-3 border-b border-[#F1F5F9] last:border-0">
      <div className="flex items-start justify-between gap-4">
        <Link href={`/meetings/${meeting.id}`} className="font-semibold text-sm text-[#F97316] hover:underline">
          {meeting.fields["Attendee Name"]}
        </Link>
        <span className="text-xs bg-[#F1F5F9] text-[#64748B] rounded-full px-2 py-1 flex-shrink-0">
          {formatDate(meeting.fields["Scheduled Meeting Date"])}
        </span>
      </div>
      {outcome && (
        <div className="mt-1">
          <p className={`text-sm text-[#64748B] ${expanded ? "" : "line-clamp-3"}`}>
            {outcome}
          </p>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-[#0EA5E9] mt-1 hover:underline"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        </div>
      )}
    </div>
  );
}

export function ClientMeetingsList({ meetings }: ClientMeetingsListProps) {
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
    <div>
      {sorted.map((m) => (
        <MeetingRow key={m.id} meeting={m} />
      ))}
    </div>
  );
}
