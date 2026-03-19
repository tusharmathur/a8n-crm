import { Metadata } from "next";
import Link from "next/link";
import { A8NBadge } from "@/components/ui/A8NBadge";
import { airtableFetchOne, airtableFetch } from "@/lib/airtable";
import { AccountFields, CampaignFields, MeetingFields, Campaign } from "@/types";
import { extractTokenFromLink, timingSafeCompare } from "@/lib/token";
import { Badge } from "@/components/ui/Badge";
import { CampaignPerformanceSection } from "@/components/dashboard/CampaignPerformanceSection";
import { MeetingsChart } from "@/components/dashboard/MeetingsChart";
import { ClientMeetingsList } from "@/components/dashboard/ClientMeetingsList";
import { groupMeetingsByMonth } from "@/lib/utils";

interface Props {
  params: Promise<{ accountId: string }>;
  searchParams: Promise<{ token?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { accountId } = await params;
  const account = await airtableFetchOne<AccountFields>("Accounts", accountId);
  return {
    title: account ? `${account.fields["Name"]} — A8N CRM` : "Dashboard — A8N CRM",
    robots: { index: false, follow: false },
  };
}

function ErrorPage({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <div className="bg-white border border-[#E2E8F0] rounded-[12px] p-10 text-center shadow-sm max-w-sm">
        <div className="flex justify-center mb-4">
          <A8NBadge size={40} />
        </div>
        <p className="text-[#1E293B] font-semibold mb-2">{message}</p>
        <p className="text-sm text-[#64748B]">
          Contact your Acceler8Now representative for access.
        </p>
      </div>
    </div>
  );
}

export default async function ClientDashboardPage({ params, searchParams }: Props) {
  const { accountId } = await params;
  const { token } = await searchParams;

  if (!token) {
    return <ErrorPage message="Access denied." />;
  }

  const account = await airtableFetchOne<AccountFields>("Accounts", accountId);
  if (!account) {
    return <ErrorPage message="Dashboard not found." />;
  }

  const storedLink = account.fields["Dashboard Link"];
  const storedToken = storedLink ? extractTokenFromLink(storedLink) : null;
  if (!storedToken || !timingSafeCompare(token, storedToken)) {
    return <ErrorPage message="Access denied." />;
  }

  const [allCampaigns, allMeetings] = await Promise.all([
    airtableFetch<CampaignFields>("Campaigns"),
    airtableFetch<MeetingFields>("Meetings"),
  ]);

  const campaigns: Campaign[] = allCampaigns
    .filter((c) => c.fields["Account"]?.includes(accountId))
    .map((c) => ({ ...c, accountName: account.fields["Name"] }));

  const meetings = allMeetings.filter((m) => m.fields["Account"]?.includes(accountId));

  const chartData = groupMeetingsByMonth(
    meetings.map((m) => ({ scheduledDate: m.fields["Scheduled Meeting Date"] }))
  );

  const fields = account.fields;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-white border-b border-[#E2E8F0] h-14 flex items-center px-6">
        <a
          href="https://www.acceler8now.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2"
        >
          <A8NBadge size={32} />
          <span style={{ fontSize: 16, fontWeight: 700, color: "#1E293B" }}>CRM</span>
        </a>
        <span className="ml-auto text-[11px] bg-[#F1F5F9] text-[#94A3B8] rounded-md px-2 py-1">
          Read-only view
        </span>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* Account header card */}
        <div className="bg-white border border-[#E2E8F0] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] mb-6">
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-2xl font-bold text-[#1E293B]">{fields["Name"]}</h1>
            {fields["Status"] && (
              <Badge value={fields["Status"]}>{fields["Status"]}</Badge>
            )}
          </div>
          {fields["Website"] && (
            <a
              href={fields["Website"]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#0EA5E9] hover:underline"
            >
              🌐 Website
            </a>
          )}
        </div>

        {/* Campaign performance */}
        <CampaignPerformanceSection campaigns={campaigns} accountId={accountId} readOnly />

        {/* Meetings per month chart */}
        <div className="bg-white border border-[#E2E8F0] rounded-[12px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] mb-6">
          <h3 className="text-sm font-semibold text-[#1E293B] mb-4">Meetings per Month</h3>
          <MeetingsChart data={chartData} />
        </div>

        {/* Meetings list */}
        <div className="bg-white border border-[#E2E8F0] rounded-[12px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] mb-8">
          <h3 className="text-sm font-semibold text-[#1E293B] mb-4">
            All Meetings ({meetings.length})
          </h3>
          <ClientMeetingsList meetings={meetings} />
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[#94A3B8]">
          Powered by{" "}
          <a
            href="https://www.acceler8now.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#F97316] hover:underline"
          >
            Acceler8Now
          </a>
        </p>
      </div>
    </div>
  );
}
