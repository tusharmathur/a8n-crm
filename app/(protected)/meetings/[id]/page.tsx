import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { airtableFetchOne } from "@/lib/airtable";
import { MeetingFields, AccountFields, CampaignFields } from "@/types";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/Button";
import { MeetingBackgroundSection } from "@/components/meetings/MeetingBackgroundSection";
import Link from "next/link";
import { formatDate, formatDateTime } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="pb-2 mb-3 border-b border-[#E2E8F0]">
      <p className="text-[12px] uppercase font-bold text-[#94A3B8] tracking-[0.5px]">{title}</p>
    </div>
  );
}

function DetailRow({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={`flex gap-4 py-3 ${last ? "" : "border-b border-[#F1F5F9]"}`}>
      <span className="text-[13px] text-[#94A3B8] font-medium w-36 flex-shrink-0">{label}</span>
      <span className="text-[13px] text-[#1E1B4B] font-medium min-w-0">{children}</span>
    </div>
  );
}

function Empty() {
  return <span className="text-[#CBD5E1]">—</span>;
}

export default async function MeetingDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();

  const record = await airtableFetchOne<MeetingFields>("Meetings", id);
  if (!record) notFound();

  const f = record.fields;
  const accountId = f["Account"]?.[0];
  const campaignId = f["Campaign"]?.[0];

  const [accountRecord, campaignRecord] = await Promise.all([
    accountId ? airtableFetchOne<AccountFields>("Accounts", accountId) : Promise.resolve(null),
    campaignId ? airtableFetchOne<CampaignFields>("Campaigns", campaignId) : Promise.resolve(null),
  ]);

  const accountName = accountRecord?.fields["Name"];
  const campaignName = campaignRecord?.fields["Campaign Name"];
  const campaignPurpose = campaignRecord?.fields["Purpose"];

  return (
    <div>
      <TopBar title="Meeting Detail" userName={session?.user?.name ?? ""} />
      <div className="p-6 max-w-3xl">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/meetings" className="text-sm text-[#64748B] hover:text-[#1E1B4B] flex items-center gap-1">
            ← Meetings
          </Link>
          <Link href={`/meetings/${id}/edit`}>
            <Button variant="primary">✏ Edit Meeting</Button>
          </Link>
        </div>

        {/* Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1E1B4B]">{f["Attendee Name"]}</h1>
          {(accountName || campaignName) && (
            <p className="text-sm text-[#64748B] mt-1">
              {[accountName, campaignName].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        {/* Section 1: Meeting Info */}
        <div className="bg-white border border-[#E2E8F0] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] mb-4">
          <SectionHeader title="Meeting Info" />
          <DetailRow label="Account">
            {accountId && accountName ? (
              <Link href={`/accounts/${accountId}`} className="text-[#6B21A8] hover:underline font-medium">
                {accountName}
              </Link>
            ) : <Empty />}
          </DetailRow>
          <DetailRow label="Campaign">
            {campaignName ?? <Empty />}
          </DetailRow>
          <DetailRow label="Scheduled Date">
            {f["Scheduled Meeting Date"] ? formatDateTime(f["Scheduled Meeting Date"]) : <Empty />}
          </DetailRow>
          <DetailRow label="Creation Date">
            {f["Meeting Creation Date"] ? formatDate(f["Meeting Creation Date"]) : <Empty />}
          </DetailRow>
          <DetailRow label="Meeting Taker">
            {f["Meeting Taker"] ?? <Empty />}
          </DetailRow>
          <DetailRow label="Taker Email" last>
            {f["Meeting Taker Email"] ? (
              <a href={`mailto:${f["Meeting Taker Email"]}`} className="hover:underline">
                {f["Meeting Taker Email"]}
              </a>
            ) : <Empty />}
          </DetailRow>
        </div>

        {/* Section 2: Attendee Info */}
        <div className="bg-white border border-[#E2E8F0] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] mb-4">
          <SectionHeader title="Attendee" />
          <DetailRow label="Name">
            {f["Attendee Name"] ? (
              <span className="font-bold text-[#1E1B4B]">{f["Attendee Name"]}</span>
            ) : <Empty />}
          </DetailRow>
          <DetailRow label="Company">
            {f["Attendee Company"] ?? <Empty />}
          </DetailRow>
          <DetailRow label="Email">
            {f["Attendee Email"] ? (
              <a href={`mailto:${f["Attendee Email"]}`} className="text-[#6B21A8] hover:underline font-medium">
                {f["Attendee Email"]}
              </a>
            ) : <Empty />}
          </DetailRow>
          <DetailRow label="Phone">
            {f["Attendee Phone"] ? (
              <a href={`tel:${f["Attendee Phone"]}`} className="hover:underline">
                {f["Attendee Phone"]}
              </a>
            ) : <Empty />}
          </DetailRow>
          <DetailRow label="LinkedIn" last>
            {f["Attendee LinkedIn"] ? (
              <a
                href={f["Attendee LinkedIn"]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#6B21A8] font-medium no-underline hover:underline"
              >
                View LinkedIn Profile →
              </a>
            ) : <Empty />}
          </DetailRow>
        </div>

        {/* Section 3: Attendee Background */}
        <MeetingBackgroundSection
          meetingId={id}
          initialBackground={f["Attendee Background"]}
          attendeeName={f["Attendee Name"]}
          attendeeEmail={f["Attendee Email"]}
          attendeeLinkedIn={f["Attendee LinkedIn"]}
          attendeeWebsite={f["Attendee Website"]}
          attendeeCompany={f["Attendee Company"]}
          accountName={accountName}
          campaignName={campaignName}
          campaignPurpose={campaignPurpose}
          accountIds={f["Account"] ?? []}
          campaignIds={f["Campaign"] ?? []}
        />
      </div>
    </div>
  );
}
