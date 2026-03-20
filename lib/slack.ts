import { WebClient } from "@slack/web-api";

export interface MeetingSlackPayload {
  attendeeName: string;
  attendeeCompany?: string;
  campaignName?: string;
  scheduledDate?: string;
  meetingTaker?: string;
  accountName?: string;
  accountDashboardLink?: string;
  slackChannel?: string;
  meetingId?: string;
}

export function formatMeetingDate(dateStr?: string): string {
  if (!dateStr) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export function normalizeChannel(channel: string): string {
  return channel.startsWith("#") ? channel.slice(1) : channel;
}

export function buildMeetingBlocks(payload: MeetingSlackPayload) {
  const { attendeeName, attendeeCompany, campaignName, scheduledDate, meetingTaker, accountName, accountDashboardLink, meetingId } = payload;
  const formattedDate = formatMeetingDate(scheduledDate);
  const meetingUrl = meetingId ? `${process.env.NEXT_PUBLIC_APP_URL}/meetings/${meetingId}` : undefined;

  return {
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "📅 New Meeting Set", emoji: true },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: [
            `*Attendee:* ${attendeeName}`,
            `*Company:* ${attendeeCompany ?? "—"}`,
            `*Campaign:* ${campaignName ?? "—"}`,
            `*Meeting Taker:* ${meetingTaker ?? "—"}`,
            `*Scheduled:* ${formattedDate}`,
            `*Account:* ${accountName ?? "—"}`,
          ].join("\n"),
        },
      },
      ...((accountDashboardLink || meetingUrl)
        ? [
            {
              type: "actions",
              elements: [
                ...(accountDashboardLink ? [{
                  type: "button",
                  text: { type: "plain_text", text: "View Account Dashboard", emoji: true },
                  url: accountDashboardLink,
                  style: "primary",
                }] : []),
                ...(meetingUrl ? [{
                  type: "button",
                  text: { type: "plain_text", text: "View Meeting →", emoji: false },
                  url: meetingUrl,
                }] : []),
              ],
            },
          ]
        : []),
      { type: "divider" },
      {
        type: "context",
        elements: [{ type: "mrkdwn", text: "Posted by A8N CRM" }],
      },
    ],
    text: `New meeting set: ${attendeeName}${attendeeCompany ? ` from ${attendeeCompany}` : ""} — ${formattedDate}${meetingUrl ? ` | ${meetingUrl}` : ""}`,
  };
}

async function listChannels(client: WebClient, types: string, normalized: string): Promise<string | null> {
  let cursor: string | undefined;
  do {
    const res = await client.conversations.list({
      exclude_archived: true,
      types,
      limit: 200,
      ...(cursor ? { cursor } : {}),
    });
    const found = res.channels?.find((c) => c.name === normalized);
    if (found?.id) return found.id;
    cursor = res.response_metadata?.next_cursor ?? undefined;
  } while (cursor);
  return null;
}

async function findChannelId(client: WebClient, channelName: string): Promise<string | null> {
  const normalized = normalizeChannel(channelName);
  try {
    return await listChannels(client, "public_channel,private_channel", normalized);
  } catch (e: unknown) {
    const code = (e as { data?: { error?: string } }).data?.error;
    if (code === "missing_scope") {
      return await listChannels(client, "public_channel", normalized);
    }
    throw e;
  }
}

async function sendViaWebhook(payload: MeetingSlackPayload): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const { attendeeName, attendeeCompany, campaignName, scheduledDate, meetingTaker, accountName, accountDashboardLink } = payload;
  const formattedDate = formatMeetingDate(scheduledDate);

  const text = [
    "📅 New Meeting Logged",
    `Attendee: ${attendeeName}${attendeeCompany ? ` (${attendeeCompany})` : ""}`,
    `Campaign: ${campaignName ?? "—"}`,
    `Meeting Taker: ${meetingTaker ?? "—"}`,
    `Scheduled: ${formattedDate}`,
    `Account: ${accountName ?? "—"}`,
    ...(accountDashboardLink ? [`Dashboard: ${accountDashboardLink}`] : []),
  ].join("\n");

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}

export async function sendMeetingSlackNotification(payload: MeetingSlackPayload): Promise<void> {
  const { slackChannel } = payload;

  if (!slackChannel?.trim()) {
    console.warn("Slack notification skipped: no channel configured");
    return;
  }

  const botToken = process.env.SLACK_BOT_TOKEN?.trim();

  if (botToken) {
    try {
      const client = new WebClient(botToken);
      const channelId = await findChannelId(client, slackChannel);

      if (!channelId) {
        console.warn(`Slack channel not found: #${normalizeChannel(slackChannel)}`);
        await sendViaWebhook(payload).catch((e) => console.error("Webhook fallback failed:", e));
        return;
      }

      const { blocks, text } = buildMeetingBlocks(payload);
      await client.chat.postMessage({ channel: channelId, blocks, text });
      return;
    } catch (err) {
      console.error("Slack bot token error:", err);
      await sendViaWebhook(payload).catch((e) => console.error("Webhook fallback failed:", e));
      return;
    }
  }

  if (process.env.SLACK_WEBHOOK_URL) {
    try {
      await sendViaWebhook(payload);
    } catch (err) {
      console.error("Slack webhook error:", err);
    }
    return;
  }

  console.warn("Slack not configured: set SLACK_BOT_TOKEN or SLACK_WEBHOOK_URL");
}
