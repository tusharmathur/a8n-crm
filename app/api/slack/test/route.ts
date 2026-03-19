import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { airtableFetchOne } from "@/lib/airtable";
import { AccountFields } from "@/types";
import { WebClient } from "@slack/web-api";
import { normalizeChannel } from "@/lib/slack";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { accountId } = await request.json();

    const account = await airtableFetchOne<AccountFields>("Accounts", accountId);
    if (!account) return Response.json({ error: "Account not found" }, { status: 404 });

    const slackChannel = account.fields["Slack Channel"];
    if (!slackChannel?.trim()) {
      return Response.json({ success: false, error: "No channel configured" });
    }

    const botToken = process.env.SLACK_BOT_TOKEN?.trim();
    if (!botToken) {
      return Response.json({ success: false, error: "SLACK_BOT_TOKEN not configured" });
    }

    const client = new WebClient(botToken);
    const normalized = normalizeChannel(slackChannel);
    const displayChannel = `#${normalized}`;

    // Step 1 — find channel ID (try both public+private, fall back to public-only)
    async function findChannel(types: string): Promise<string | null> {
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

    let channelId: string | null = null;
    try {
      channelId = await findChannel("public_channel,private_channel");
    } catch (e: unknown) {
      const code = (e as { data?: { error?: string } }).data?.error;
      if (code === "missing_scope") {
        channelId = await findChannel("public_channel");
      } else {
        throw e;
      }
    }

    if (!channelId) {
      return Response.json({
        success: false,
        error: "Channel not found. Make sure the channel name is correct and the bot is in the workspace.",
      });
    }

    // Step 2 — send test message directly; if bot not in channel, return helpful error
    try {
      await client.chat.postMessage({
        channel: channelId,
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: "🔔 Test from A8N CRM", emoji: true },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `Slack notifications are configured correctly for *${account.fields["Name"]}*.`,
            },
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `Sent via Test Slack button by ${session.user?.email ?? "unknown"}`,
              },
            ],
          },
        ],
        text: `Test from A8N CRM — notifications configured for ${account.fields["Name"]}`,
      });
    } catch (postErr: unknown) {
      const postCode = (postErr as { data?: { error?: string } }).data?.error;
      if (postCode === "not_in_channel") {
        return Response.json({
          success: false,
          error: `Bot is not in ${displayChannel}. Please /invite @YourBotName to the channel in Slack, then retry.`,
        });
      }
      throw postErr;
    }

    return Response.json({ success: true, channel: displayChannel });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Failed to send test message";
    return Response.json({ success: false, error: message });
  }
}
