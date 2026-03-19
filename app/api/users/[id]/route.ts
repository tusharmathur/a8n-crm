import { auth } from "@/auth";
import { airtableFetch, airtableUpdate, airtableDelete } from "@/lib/airtable";
import { UserFields } from "@/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();
    const { Status } = body;

    if (!Status || !["Active", "Suspended"].includes(Status)) {
      return Response.json({ error: "Status must be Active or Suspended" }, { status: 400 });
    }

    const record = await airtableUpdate<UserFields>("Users", id, { Status });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { "Password Hash": _hash, ...safeFields } = record.fields;
    return Response.json({ id: record.id, fields: safeFields, createdTime: record.createdTime });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;

    // Block deletion of own account
    const sessionEmail = session.user?.email;
    if (sessionEmail) {
      const users = await airtableFetch<UserFields>(
        "Users",
        `{Email}="${sessionEmail}"`
      );
      if (users[0]?.id === id) {
        return Response.json({ error: "Cannot delete your own account" }, { status: 403 });
      }
    }

    await airtableDelete("Users", id);
    return Response.json({ success: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
