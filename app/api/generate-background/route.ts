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
      attendeeWebsite,
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
      max_tokens: 400,
      system:
        "You are a research assistant for a B2B sales team. Generate concise, professional background briefs to help the team prepare for meetings. Be factual and practical.",
      messages: [
        {
          role: "user",
          content: `Generate a background brief for this meeting attendee.

Name: ${attendeeName}
Email: ${attendeeEmail ?? "N/A"}
LinkedIn: ${attendeeLinkedIn ?? "N/A"}
Website: ${attendeeWebsite ?? "N/A"}
Attendee's company: ${attendeeCompany ?? accountName ?? "N/A"}
We are meeting them on behalf of: ${accountName ?? "N/A"}
Campaign context: ${campaignName ?? "N/A"} — ${campaignPurpose ?? "N/A"}

Format your response exactly like this:

**Company**
2 sentences on what the attendee's company does and who their customers are.

**About [First Name]**
• Bullet on their likely role and seniority
• Bullet on their professional background
• Bullet on why they likely agreed to this meeting
• Bullet on anything relevant to the campaign context

Keep it concise and practical. No fluff.`,
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
