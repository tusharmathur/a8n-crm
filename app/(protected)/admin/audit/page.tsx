import { auth } from "@/auth";
import { airtableFetch } from "@/lib/airtable";
import { AuditLogFields, AuditLog } from "@/types";
import { TopBar } from "@/components/layout/TopBar";
import { AuditLogViewer } from "@/components/admin/AuditLogViewer";

export default async function AuditPage() {
  const session = await auth();

  const records = await airtableFetch<AuditLogFields>("Audit Log");
  const logs: AuditLog[] = records.sort((a, b) => {
    const dA = a.fields["Performed At"] ?? a.createdTime;
    const dB = b.fields["Performed At"] ?? b.createdTime;
    return new Date(dB).getTime() - new Date(dA).getTime();
  });

  return (
    <div>
      <TopBar title="Audit Log" userName={session?.user?.name ?? ""} />
      <div className="p-6">
        <h2 className="text-xl font-bold text-[#1E1B4B] mb-6">Audit Log</h2>
        <AuditLogViewer logs={logs} />
      </div>
    </div>
  );
}
