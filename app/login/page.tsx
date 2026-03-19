import Image from "next/image";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-[#E2E8F0] rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-8">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <Image
              src="https://www.acceler8now.com/hubfs/acceler8now_2021/images/logo.svg"
              alt="A8N"
              width={48}
              height={48}
              className="h-12 w-auto"
              unoptimized
            />
          </div>
          <h1 className="text-[22px] font-bold text-[#1E293B]">A8N CRM</h1>
          <p className="text-sm text-[#64748B] mt-1">Sign in to your account</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
