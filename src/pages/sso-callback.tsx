import { AuthenticateWithRedirectCallback } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SsoCallbackPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center dark bg-[#0F3D2E]">
      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl={`${basePath}/account`}
        signUpFallbackRedirectUrl={`${basePath}/account`}
      />
      <div className="text-white/60 text-sm">جارٍ تسجيل الدخول...</div>
    </div>
  );
}
