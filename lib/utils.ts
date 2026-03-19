/**
 * Get initials from a name (up to 2 characters).
 */
export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Format a date string for display: "Mar 19, 2026"
 */
export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

/**
 * Format a datetime string: "Mar 19, 2026 · 2:34 PM"
 */
export function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    const date = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const time = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${date} · ${time}`;
  } catch {
    return "—";
  }
}

/**
 * Compute the display title for a meeting.
 * Format: "{accountName} - Meeting set for {meetingTaker} with {attendeeName} from {attendeeCompany}"
 */
export function getMeetingTitle(params: {
  accountName?: string;
  meetingTaker?: string;
  attendeeName?: string;
  attendeeCompany?: string;
}): string {
  const { accountName, meetingTaker, attendeeName, attendeeCompany } = params;
  const parts: string[] = [];

  if (accountName) parts.push(accountName);
  const middle = "Meeting set for";
  const takerPart = meetingTaker ? `${middle} ${meetingTaker}` : middle;
  const attendeePart = attendeeName
    ? `${takerPart} with ${attendeeName}`
    : takerPart;
  const companyPart =
    attendeePart + (attendeeCompany ? ` from ${attendeeCompany}` : "");

  if (parts.length) return `${parts[0]} - ${companyPart}`;
  return companyPart;
}

/**
 * Group meetings by month for chart data.
 */
export function groupMeetingsByMonth(
  meetings: { scheduledDate?: string | null }[]
): { month: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const m of meetings) {
    if (!m.scheduledDate) continue;
    try {
      const d = new Date(m.scheduledDate);
      const key = d.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
      counts[key] = (counts[key] ?? 0) + 1;
    } catch {
      // skip invalid dates
    }
  }
  return Object.entries(counts).map(([month, count]) => ({ month, count }));
}
