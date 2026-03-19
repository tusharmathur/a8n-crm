"use client";

import { useState } from "react";
import { Toast, useToast } from "@/components/ui/Toast";
import { MeetingsChart } from "./MeetingsChart";
import { CampaignPerformanceSection } from "./CampaignPerformanceSection";
import { getMeetingTitle, formatDate, groupMeetingsByMonth } from "@/lib/utils";
import { Meeting, Campaign } from "@/types";
import Link from "next/link";

interface AccountDashboardClientProps {
  meetings: Meeting[];
  campaigns: Campaign[];
  accountId: string;
  dashboardLink?: string;
  slackChannel?: string;
}

/** Client-side interactive parts of the account dashboard. */
export function AccountDashboardClient({ meetings, campaigns, accountId, dashboardLink: initialDashboardLink, slackChannel }: AccountDashboardClientProps) {
  const { toast, showToast, dismissToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [dashboardLink, setDashboardLink] = useState(initialDashboardLink ?? "");
  const [generating, setGenerating] = useState(false);
  const [slackTesting, setSlackTesting] = useState(false);
  const [slackResult, setSlackResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    showToast("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyDashboardLink = () => {
    navigator.clipboard.writeText(dashboardLink);
    showToast("Link copied!");
  };

  const handleTestSlack = async () => {
    setSlackTesting(true);
    setSlackResult(null);
    try {
      const res = await fetch("/api/slack/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      const data = await res.json();
      if (data.success) {
        const note = data.botInvited ? " · Bot auto-joined channel" : "";
        setSlackResult({ ok: true, msg: `✓ Message sent to ${data.channel}${note}` });
      } else {
        setSlackResult({ ok: false, msg: `✗ ${data.error}` });
      }
    } catch {
      setSlackResult({ ok: false, msg: "✗ Request failed" });
    } finally {
      setSlackTesting(false);
      setTimeout(() => setSlackResult(null), 5000);
    }
  };

  const handleGenerateLink = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/accounts/${accountId}/generate-link`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setDashboardLink(data.dashboardLink);
        showToast("Dashboard link generated!");
      } else {
        showToast("Failed to generate link.");
      }
    } finally {
      setGenerating(false);
    }
  };

  const chartData = groupMeetingsByMonth(
    meetings.map((m) => ({ scheduledDate: m.fields["Meeting Creation Date"] }))
  );

  const lastMeetingDate = meetings
    .map((m) => m.fields["Meeting Creation Date"])
    .filter(Boolean)
    .sort()
    .at(-1);

  return (
    <>
      {/* Action bar */}
      <div className="flex items-center gap-3 mb-4">
        <Link
          href="/accounts"
          className="text-sm text-[#64748B] hover:text-[#1E293B] flex items-center gap-1"
        >
          ← Accounts
        </Link>
        <button
          onClick={handleShare}
          className="ml-auto text-sm border border-[#E2E8F0] rounded-md px-3 py-1.5 text-[#1E293B] hover:bg-[#F8FAFC] flex items-center gap-1"
        >
          🔗 {copied ? "Link copied!" : "Share Link"}
        </button>
      </div>

      {/* Client dashboard link row */}
      <div className="bg-white border border-[#E2E8F0] rounded-[10px] px-4 py-3 mb-6 flex items-center gap-3 flex-wrap">
        <span className="text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium flex-shrink-0">
          Client Dashboard Link
        </span>
        {dashboardLink ? (
          <>
            <span className="text-xs text-[#64748B] font-mono truncate max-w-xs flex-1">
              {dashboardLink}
            </span>
            <button
              onClick={handleCopyDashboardLink}
              className="text-xs border border-[#E2E8F0] rounded-md px-2.5 py-1 text-[#1E293B] hover:bg-[#F8FAFC] flex-shrink-0"
            >
              Copy Link
            </button>
            <a
              href={dashboardLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs border border-[#E2E8F0] rounded-md px-2.5 py-1 text-[#1E293B] hover:bg-[#F8FAFC] flex-shrink-0"
            >
              Open
            </a>
          </>
        ) : (
          <button
            onClick={handleGenerateLink}
            disabled={generating}
            className="text-xs border border-[#E2E8F0] rounded-md px-2.5 py-1 text-[#1E293B] hover:bg-[#F8FAFC] disabled:opacity-50"
          >
            {generating ? "Generating…" : "Generate Link"}
          </button>
        )}
      </div>

      {/* Slack channel row */}
      <div className="bg-white border border-[#E2E8F0] rounded-[10px] px-4 py-3 mb-6 flex items-center gap-3 flex-wrap">
        <span className="text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium flex-shrink-0">
          Slack Channel
        </span>
        {slackChannel ? (
          <>
            <span className="text-sm text-[#1E293B] font-mono">{slackChannel}</span>
            <button
              onClick={handleTestSlack}
              disabled={slackTesting}
              className="ml-auto text-xs border border-[#E2E8F0] rounded-md px-2.5 py-1 text-[#1E293B] hover:bg-[#F8FAFC] disabled:opacity-50 flex-shrink-0"
            >
              {slackTesting ? "Testing…" : "🔔 Test Slack"}
            </button>
          </>
        ) : (
          <span className="text-sm text-[#94A3B8]">No Slack channel configured</span>
        )}
        {slackResult && (
          <span className={`text-xs w-full mt-1 ${slackResult.ok ? "text-[#10B981]" : "text-[#EF4444]"}`}>
            {slackResult.msg}
          </span>
        )}
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[10px] px-5 py-4">
          <p className="text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium mb-1">Total Meetings</p>
          <p className="text-[20px] font-bold text-[#1E293B]">{meetings.length}</p>
        </div>
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[10px] px-5 py-4">
          <p className="text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium mb-1">Last Meeting</p>
          <p className="text-[20px] font-bold text-[#1E293B]">{formatDate(lastMeetingDate)}</p>
        </div>
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[10px] px-5 py-4">
          <p className="text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium mb-1">Account ID</p>
          <p className="text-sm font-mono text-[#94A3B8] truncate">{accountId}</p>
        </div>
      </div>

      {/* Campaign performance */}
      <CampaignPerformanceSection campaigns={campaigns} accountId={accountId} />

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
                const dA = a.fields["Meeting Creation Date"] ?? "";
                const dB = b.fields["Meeting Creation Date"] ?? "";
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
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-[#1E293B] truncate">{title}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className="text-xs bg-[#F1F5F9] text-[#64748B] rounded-full px-2 py-1">
                        {formatDate(m.fields["Meeting Creation Date"])}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {toast && <Toast message={toast} onDismiss={dismissToast} />}
    </>
  );
}
