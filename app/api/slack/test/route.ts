import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { airtableFetchOne } from "@/lib/airtable";
import { AccountFields } from "@/types";
import { WebClient } from "@slack/web-api";
import { normalizeChannel } from "@/lib/slack";

// Cached bot user ID — resolved once per lambda instance
let cachedBotUserId: string | null = null;

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
        // Bot lacks groups:read — try public channels only
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

    // Step 2 — auto-invite bot to private channel
    let botInvited = false;

    if (!cachedBotUserId) {
      const authRes = await client.auth.test();
      cachedBotUserId = authRes.user_id as string;
    }

    try {
      await client.conversations.invite({ channel: channelId, users: cachedBotUserId });
      botInvited = true;
    } catch (inviteErr: unknown) {
      const errCode = (inviteErr as { data?: { error?: string } }).data?.error;
      if (errCode !== "already_in_channel") {
        const errMsg = (inviteErr as { message?: string }).message ?? "Failed to invite bot to channel";
        return Response.json({ success: false, error: errMsg });
      }
      // already_in_channel — treat as success
    }

    // Step 3 — send test message
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

    return Response.json({ success: true, channel: displayChannel, botInvited });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Failed to send test message";
    return Response.json({ success: false, error: message });
  }
}
