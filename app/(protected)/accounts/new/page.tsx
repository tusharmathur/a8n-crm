import { auth } from "@/auth";
import { TopBar } from "@/components/layout/TopBar";
import { AccountForm } from "@/components/forms/AccountForm";
import { Card } from "@/components/ui/Card";

export default async function NewAccountPage() {
  const session = await auth();
  return (
    <div>
      <TopBar title="New Account" userName={session?.user?.name ?? ""} />
      <div className="p-6">
        <Card className="max-w-[680px]">
          <h2 className="text-lg font-semibold text-[#1E293B] mb-6">Create Account</h2>
          <AccountForm />
        </Card>
      </div>
    </div>
  );
}
