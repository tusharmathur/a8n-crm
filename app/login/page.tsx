import { A8NBadge } from "@/components/ui/A8NBadge";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-[#E2E8F0] rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-8">
        <div className="text-center mb-6">
          <div className="flex justify-center items-center gap-2 mb-4">
            <A8NBadge size={40} />
            <span style={{ fontSize: 16, fontWeight: 700, color: "#1E1B4B" }}>CRM</span>
          </div>
          <p className="text-sm text-[#64748B] mt-1">Sign in to your account</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
