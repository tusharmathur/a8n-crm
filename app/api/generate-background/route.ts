import { NextRequest } from "next/server";
import { auth } from "@/auth";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const {
      attendeeName,
      attendeeEmail,
      attendeeLinkedIn,
      accountName,
      campaignName,
      campaignPurpose,
    } = body;

    if (!attendeeName?.trim()) {
      return Response.json({ error: "Attendee name is required" }, { status: 400 });
    }

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      system:
        "You are a research assistant for a B2B sales team. Generate concise, professional background briefs about meeting attendees to help the team prepare. Be factual and practical. 3-5 sentences max.",
      messages: [
        {
          role: "user",
          content: `Generate a background brief for this meeting attendee:
Name: ${attendeeName}
Email: ${attendeeEmail ?? "N/A"}
LinkedIn: ${attendeeLinkedIn ?? "N/A"}
Their company / account: ${accountName ?? "N/A"}
Campaign context: ${campaignName ?? "N/A"} — ${campaignPurpose ?? "N/A"}

Cover: what their company does, the attendee's likely role and seniority, and any relevant context about why they may have agreed to this meeting. Be concise and practical.`,
        },
      ],
    });

    const block = message.content[0];
    if (block.type !== "text") {
      return Response.json({ error: "Unexpected response from AI" }, { status: 500 });
    }

    return Response.json({ background: block.text.trim() });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Failed to generate background" }, { status: 500 });
  }
}
