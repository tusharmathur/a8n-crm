"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Spinner } from "@/components/ui/Spinner";
import { Toast, useToast } from "@/components/ui/Toast";
import { Campaign } from "@/types";

interface CampaignsTableProps {
  campaigns: Campaign[];
}

export function CampaignsTable({ campaigns }: CampaignsTableProps) {
  const router = useRouter();
  const { toast, showToast, dismissToast } = useToast();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleConfirmDelete = async (id: string) => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setDeleteError(data.error ?? "Failed to delete campaign");
        return;
      }
      setPendingId(null);
      showToast("Deleted");
      setTimeout(() => router.refresh(), 500);
    } catch {
      setDeleteError("An unexpected error occurred");
    } finally {
      setDeleting(false);
    }
  };

  const handleCancel = () => {
    setPendingId(null);
    setDeleteError(null);
  };

  return (
    <>
      <div className="bg-white border border-[#E2E8F0] rounded-[12px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <table className="w-full text-sm">
          <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
            <tr>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Campaign Name</th>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Account</th>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Requests Sent</th>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Accepted</th>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Replies</th>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Acceptance Rate</th>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Reply Rate</th>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c, i) => {
              const isPending = pendingId === c.id;
              return (
                <>
                  <tr
                    key={c.id}
                    className={`hover:bg-[#F8FAFC] ${i < campaigns.length - 1 || isPending ? "border-b border-[#F1F5F9]" : ""}`}
                  >
                    <td className="px-4 py-3 font-semibold text-[#1E1B4B]">{c.fields["Campaign Name"]}</td>
                    <td className="px-4 py-3 text-[#64748B]">{c.accountName ?? "—"}</td>
                    <td className="px-4 py-3 text-[#64748B]">{c.fields["Requests Sent"] ?? "—"}</td>
                    <td className="px-4 py-3 text-[#64748B]">{c.fields["Requests Accepted"] ?? "—"}</td>
                    <td className="px-4 py-3 text-[#64748B]">{c.fields["Replies"] ?? "—"}</td>
                    <td className="px-4 py-3 text-[#64748B]">{c.fields["Acceptance Rate"] ?? "—"}</td>
                    <td className="px-4 py-3 text-[#64748B]">{c.fields["Reply Rate"] ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link href={`/campaigns/${c.id}/edit`}>
                          <button className="text-xs border border-[#E2E8F0] rounded-md px-3 py-1 text-[#1E1B4B] hover:bg-[#F8FAFC]">
                            Edit
                          </button>
                        </Link>
                        {!isPending && (
                          <button
                            onClick={() => { setDeleteError(null); setPendingId(c.id); }}
                            className="text-xs border border-[#FCA5A5] rounded-md px-3 py-1 text-[#EF4444] hover:bg-[#FFF5F5]"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isPending && (
                    <tr key={`${c.id}-confirm`} className="bg-[#FFF5F5] border-b border-[#FCA5A5]">
                      <td colSpan={8} className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-[#1E1B4B]">
                            Delete &ldquo;{c.fields["Campaign Name"]}&rdquo;? This cannot be undone.
                          </span>
                          <button
                            onClick={handleCancel}
                            className="text-xs border border-[#E2E8F0] rounded-md px-3 py-1 text-[#64748B] hover:bg-white"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleConfirmDelete(c.id)}
                            disabled={deleting}
                            className="text-xs rounded-md px-3 py-1 bg-[#EF4444] text-white hover:bg-[#DC2626] disabled:opacity-50 flex items-center gap-1"
                          >
                            {deleting ? <><Spinner size="sm" /> Deleting…</> : "Yes, Delete"}
                          </button>
                        </div>
                        {deleteError && (
                          <p className="text-[#EF4444] text-xs mt-2">{deleteError}</p>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
      {toast && <Toast message={toast} variant="error" onDismiss={dismissToast} />}
    </>
  );
}
