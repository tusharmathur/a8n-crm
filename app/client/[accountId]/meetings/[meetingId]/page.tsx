import { Metadata } from "next";
import { A8NBadge } from "@/components/ui/A8NBadge";
import { airtableFetchOne } from "@/lib/airtable";
import { AccountFields, MeetingFields } from "@/types";
import { extractTokenFromLink, timingSafeCompare } from "@/lib/token";
import { formatDate } from "@/lib/utils";

interface Props {
  params: Promise<{ accountId: string; meetingId: string }>;
  searchParams: Promise<{ token?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { meetingId } = await params;
  const meeting = await airtableFetchOne<MeetingFields>("Meetings", meetingId);
  return {
    title: meeting ? `${meeting.fields["Attendee Name"]} — A8N CRM` : "Meeting — A8N CRM",
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
        <p className="text-[#1E1B4B] font-semibold mb-2">{message}</p>
        <p className="text-sm text-[#64748B]">
          Contact your Acceler8Now representative for access.
        </p>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-0 py-3 border-b border-[#F1F5F9] last:border-0">
      <span className="text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium sm:w-40 flex-shrink-0">
        {label}
      </span>
      <span className="text-sm text-[#1E1B4B]">
        {value ?? <span className="text-[#CBD5E1]">—</span>}
      </span>
    </div>
  );
}

export default async function ClientMeetingDetailPage({ params, searchParams }: Props) {
  const { accountId, meetingId } = await params;
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

  const meeting = await airtableFetchOne<MeetingFields>("Meetings", meetingId);
  if (!meeting) {
    return <ErrorPage message="Meeting not found." />;
  }

  if (!meeting.fields["Account"]?.includes(accountId)) {
    return <ErrorPage message="Meeting not found." />;
  }

  const f = meeting.fields;
  const backUrl = `/client/${accountId}?token=${token}`;

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
          <span style={{ fontSize: 16, fontWeight: 700, color: "#1E1B4B" }}>Dashboard</span>
        </a>
        <span className="ml-auto text-[11px] bg-[#F5F3FF] text-[#4C1D95] rounded-md px-2 py-1 font-medium">
          Read-only view
        </span>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-6">
        {/* Back link */}
        <a
          href={backUrl}
          className="text-sm text-[#64748B] hover:text-[#1E1B4B] flex items-center gap-1 mb-6"
        >
          ← Back to Dashboard
        </a>

        {/* Meeting Info */}
        <div className="bg-white border border-[#E2E8F0] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] mb-6">
          <h2 className="text-base font-semibold text-[#1E1B4B] mb-4">Meeting Info</h2>
          <DetailRow label="Meeting Taker" value={f["Meeting Taker"]} />
          <DetailRow label="Scheduled Date" value={formatDate(f["Scheduled Meeting Date"])} />
          <DetailRow label="Created" value={formatDate(f["Meeting Creation Date"])} />
          <div className="py-3 border-b border-[#F1F5F9] last:border-0">
            <span className="text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium block mb-2">
              Outcome / Next Steps
            </span>
            {f["Outcome / Next Steps"] ? (
              <p className="text-sm text-[#1E1B4B] whitespace-pre-wrap">{f["Outcome / Next Steps"]}</p>
            ) : (
              <span className="text-[#CBD5E1] text-sm">—</span>
            )}
          </div>
        </div>

        {/* Attendee Info */}
        <div className="bg-white border border-[#E2E8F0] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] mb-6">
          <h2 className="text-base font-semibold text-[#1E1B4B] mb-4">Attendee Info</h2>
          <DetailRow label="Name" value={f["Attendee Name"]} />
          <DetailRow label="Company" value={f["Attendee Company"]} />
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[#94A3B8]">
          Powered by{" "}
          <a
            href="https://www.acceler8now.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#6B21A8] hover:underline"
          >
            Acceler8Now
          </a>
        </p>
      </div>
    </div>
  );
}
