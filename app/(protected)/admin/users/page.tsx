import { auth } from "@/auth";
import { airtableFetch } from "@/lib/airtable";
import { UserFields, SafeUser } from "@/types";
import { TopBar } from "@/components/layout/TopBar";
import { UsersManager } from "@/components/admin/UsersManager";

export default async function UsersPage() {
  const session = await auth();

  const records = await airtableFetch<UserFields>("Users");
  const users: SafeUser[] = records.map(({ id, fields, createdTime }) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { "Password Hash": _hash, ...safeFields } = fields;
    return { id, fields: safeFields, createdTime };
  });

  return (
    <div>
      <TopBar title="Users" userName={session?.user?.name ?? ""} />
      <div className="p-6">
        <h2 className="text-xl font-bold text-[#1E1B4B] mb-6">Users</h2>
        <UsersManager
          initialUsers={users}
          currentUserEmail={session?.user?.email ?? ""}
        />
      </div>
    </div>
  );
}
