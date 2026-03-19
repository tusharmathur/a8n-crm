"use client";

import { useState, useMemo } from "react";
import { AuditLog } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Input";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";

const PAGE_SIZE = 50;

interface AuditLogViewerProps {
  logs: AuditLog[];
}

/** Paginated, filterable audit log table with row expansion. */
export function AuditLogViewer({ logs }: AuditLogViewerProps) {
  const [entityTypeFilter, setEntityTypeFilter] = useState("All");
  const [performedByFilter, setPerformedByFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const uniquePerformers = useMemo(
    () => [...new Set(logs.map((l) => l.fields["Performed By"]).filter(Boolean))],
    [logs]
  );

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      if (entityTypeFilter !== "All" && log.fields["Entity Type"] !== entityTypeFilter) return false;
      if (performedByFilter !== "All" && log.fields["Performed By"] !== performedByFilter) return false;
      if (dateFrom) {
        const logDate = new Date(log.fields["Performed At"]);
        if (logDate < new Date(dateFrom)) return false;
      }
      if (dateTo) {
        const logDate = new Date(log.fields["Performed At"]);
        if (logDate > new Date(dateTo + "T23:59:59")) return false;
      }
      return true;
    });
  }, [logs, entityTypeFilter, performedByFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const clearFilters = () => {
    setEntityTypeFilter("All");
    setPerformedByFilter("All");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3 mb-4 bg-white border border-[#E2E8F0] rounded-[12px] p-4 shadow-sm">
        <div>
          <label className="block text-[11px] uppercase tracking-wide text-[#64748B] font-semibold mb-1">Entity Type</label>
          <Select value={entityTypeFilter} onChange={(e) => { setEntityTypeFilter(e.target.value); setPage(1); }} className="w-36">
            <option>All</option>
            <option>Account</option>
            <option>Campaign</option>
            <option>Meeting</option>
          </Select>
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wide text-[#64748B] font-semibold mb-1">Performed By</label>
          <Select value={performedByFilter} onChange={(e) => { setPerformedByFilter(e.target.value); setPage(1); }} className="w-44">
            <option>All</option>
            {uniquePerformers.map((p) => <option key={p}>{p}</option>)}
          </Select>
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wide text-[#64748B] font-semibold mb-1">Date From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="border border-[#CBD5E1] rounded-[8px] px-3 py-[9px] text-sm text-[#1E293B] bg-white focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#FED7AA]"
          />
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wide text-[#64748B] font-semibold mb-1">Date To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="border border-[#CBD5E1] rounded-[8px] px-3 py-[9px] text-sm text-[#1E293B] bg-white focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#FED7AA]"
          />
        </div>
        <button
          onClick={clearFilters}
          className="text-sm text-[#0EA5E9] hover:underline self-end pb-[10px]"
        >
          Clear Filters
        </button>
      </div>

      {paginated.length === 0 ? (
        <p className="text-center text-[#94A3B8] mt-10">No audit log entries yet.</p>
      ) : (
        <>
          <div className="bg-white border border-[#E2E8F0] rounded-[12px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <table className="w-full text-sm">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <tr>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Performed At</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Action</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Entity Type</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Entity Name</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-[#94A3B8] font-medium">Performed By</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((log, i) => (
                  <>
                    <tr
                      key={log.id}
                      onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                      className={`cursor-pointer hover:bg-[#F8FAFC] ${i < paginated.length - 1 ? "border-b border-[#F1F5F9]" : ""}`}
                    >
                      <td className="px-4 py-3 text-[#64748B] whitespace-nowrap">
                        {formatDateTime(log.fields["Performed At"])}
                      </td>
                      <td className="px-4 py-3 text-[#1E293B]">{log.fields["Action"]}</td>
                      <td className="px-4 py-3">
                        <Badge value={log.fields["Entity Type"]}>{log.fields["Entity Type"]}</Badge>
                      </td>
                      <td className="px-4 py-3 text-[#1E293B]">
                        {log.fields["Entity Type"] === "Account" ? (
                          <Link
                            href={`/accounts/${log.fields["Entity ID"]}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[#0EA5E9] hover:underline"
                          >
                            {log.fields["Entity Name"]}
                          </Link>
                        ) : log.fields["Entity Name"]}
                      </td>
                      <td className="px-4 py-3 text-[#64748B] truncate max-w-[160px]">
                        {log.fields["Performed By"]}
                      </td>
                    </tr>
                    {expandedId === log.id && (
                      <tr key={`${log.id}-details`} className="bg-[#F8FAFC]">
                        <td colSpan={5} className="px-4 py-3">
                          <pre className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[8px] p-3 text-[12px] text-[#1E293B] overflow-auto whitespace-pre-wrap">
                            {log.fields["Details"]
                              ? JSON.stringify(JSON.parse(log.fields["Details"]), null, 2)
                              : "No details available"}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-4 mt-4 text-sm text-[#64748B]">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="disabled:opacity-40 hover:text-[#1E293B]"
            >
              ← Prev
            </button>
            <span>Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="disabled:opacity-40 hover:text-[#1E293B]"
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
