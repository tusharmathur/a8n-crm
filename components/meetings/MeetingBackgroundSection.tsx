"use client";

import { useState } from "react";
import { Spinner } from "@/components/ui/Spinner";

interface MeetingBackgroundSectionProps {
  meetingId: string;
  initialBackground?: string;
  attendeeName: string;
  attendeeEmail?: string;
  attendeeLinkedIn?: string;
  attendeeWebsite?: string;
  attendeeCompany?: string;
  accountName?: string;
  campaignName?: string;
  campaignPurpose?: string;
  accountIds: string[];
  campaignIds: string[];
}

export function MeetingBackgroundSection({
  meetingId,
  initialBackground,
  attendeeName,
  attendeeEmail,
  attendeeLinkedIn,
  attendeeWebsite,
  attendeeCompany,
  accountName,
  campaignName,
  campaignPurpose,
  accountIds,
  campaignIds,
}: MeetingBackgroundSectionProps) {
  const [background, setBackground] = useState(initialBackground ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const genRes = await fetch("/api/generate-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendeeName,
          attendeeEmail,
          attendeeLinkedIn,
          attendeeWebsite,
          attendeeCompany,
          accountName,
          campaignName,
          campaignPurpose,
        }),
      });
      const genData = await genRes.json();
      if (!genRes.ok) throw new Error(genData.error ?? "Failed to generate");

      const newBackground: string = genData.background;

      await fetch(`/api/meetings/${meetingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "Attendee Name": attendeeName,
          Account: accountIds,
          Campaign: campaignIds,
          "Attendee Background": newBackground,
        }),
      });

      setBackground(newBackground);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = () => generate();

  const handleRegenerate = () => setConfirming(true);

  const handleConfirmRegenerate = () => {
    setConfirming(false);
    generate();
  };

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#E2E8F0]">
        <p className="text-[12px] uppercase font-bold text-[#94A3B8] tracking-[0.5px]">
          Attendee Background
        </p>
        {background && !confirming && (
          <button
            onClick={handleRegenerate}
            disabled={loading}
            className="text-xs border border-[#E2E8F0] rounded-md px-2.5 py-1 text-[#1E293B] hover:bg-[#F8FAFC] disabled:opacity-50 flex items-center gap-1"
          >
            {loading ? <><Spinner size="sm" /> Generating…</> : "✨ Regenerate"}
          </button>
        )}
      </div>

      {confirming && (
        <div className="bg-[#FFF7ED] border border-[#FED7AA] rounded-[8px] p-3 mb-4 flex items-center gap-3 flex-wrap">
          <span className="text-sm text-[#1E293B] flex-1">
            Regenerate background? This will replace the existing brief.
          </span>
          <button
            onClick={() => setConfirming(false)}
            className="text-xs border border-[#E2E8F0] rounded-md px-3 py-1 text-[#64748B] hover:bg-white"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmRegenerate}
            className="text-xs rounded-md px-3 py-1 bg-[#F97316] text-white hover:bg-[#EA580C]"
          >
            Regenerate
          </button>
        </div>
      )}

      {background ? (
        <div
          className="text-[14px] text-[#1E293B] leading-[1.7] bg-[#F8FAFC] border border-[#E2E8F0] rounded-[8px] px-5 py-4"
          style={{ whiteSpace: "pre-wrap" }}
        >
          {background}
        </div>
      ) : (
        <div>
          <p className="text-sm text-[#94A3B8] mb-3">No background generated yet.</p>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="text-sm border border-[#E2E8F0] rounded-md px-3 py-2 text-[#1E293B] hover:bg-[#F8FAFC] disabled:opacity-50 flex items-center gap-1"
          >
            {loading ? <><Spinner size="sm" /> Generating…</> : "✨ Generate Background"}
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs text-[#EF4444] mt-2">{error}</p>
      )}
    </div>
  );
}
