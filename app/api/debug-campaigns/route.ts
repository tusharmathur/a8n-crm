import { NextRequest } from "next/server";
import { airtableFetch } from "@/lib/airtable";
import { CampaignFields } from "@/types";

export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get("account");
  if (!accountId) {
    return Response.json({ error: "?account= required" }, { status: 400 });
  }

  const results: Record<string, unknown> = { accountId };

  try {
    // Try 1: no filter — get all campaigns
    const all = await airtableFetch<CampaignFields>("Campaigns");
    results.allCampaigns = all.map((r) => ({
      id: r.id,
      name: r.fields["Campaign Name"],
      accountIds: r.fields["Account"],
    }));
  } catch (e) {
    results.allError = String(e);
  }

  try {
    // Try 2: FIND without > 0
    const f1 = `FIND("${accountId}", ARRAYJOIN({Account}))`;
    results.formula1 = f1;
    const r1 = await airtableFetch<CampaignFields>("Campaigns", f1);
    results.result1 = r1.map((r) => ({ id: r.id, name: r.fields["Campaign Name"] }));
  } catch (e) {
    results.error1 = String(e);
  }

  try {
    // Try 3: FIND with > 0
    const f2 = `FIND("${accountId}", ARRAYJOIN({Account})) > 0`;
    results.formula2 = f2;
    const r2 = await airtableFetch<CampaignFields>("Campaigns", f2);
    results.result2 = r2.map((r) => ({ id: r.id, name: r.fields["Campaign Name"] }));
  } catch (e) {
    results.error2 = String(e);
  }

  try {
    // Try 4: search by record ID in a different way
    const f3 = `SEARCH("${accountId}", ARRAYJOIN({Account}, ","))`;
    results.formula3 = f3;
    const r3 = await airtableFetch<CampaignFields>("Campaigns", f3);
    results.result3 = r3.map((r) => ({ id: r.id, name: r.fields["Campaign Name"] }));
  } catch (e) {
    results.error3 = String(e);
  }

  return Response.json(results);
}
