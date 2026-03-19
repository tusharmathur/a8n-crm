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
      attendeeCompany,
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
          content: `Generate a background brief focused on this individual meeting attendee:
Name: ${attendeeName}
Email: ${attendeeEmail ?? "N/A"}
LinkedIn: ${attendeeLinkedIn ?? "N/A"}
Attendee's company: ${attendeeCompany ?? accountName ?? "N/A"}
We are meeting them on behalf of: ${accountName ?? "N/A"}
Campaign context: ${campaignName ?? "N/A"} — ${campaignPurpose ?? "N/A"}

Focus on the PERSON: their likely role, seniority, professional background, and why they may have agreed to this meeting. Do not write about the company in general — write about this individual. Be concise and practical. 3-5 sentences.`,
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
