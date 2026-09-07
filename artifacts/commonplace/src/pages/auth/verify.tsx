import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useVerifyEmail } from "@workspace/api-client-react";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function VerifyEmailPage() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const verifyEmail = useVerifyEmail();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    setToken(t);
    if (t) {
      verifyEmail.mutate({ data: { token: t } });
    }
  }, []);

  if (!token) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle size={28} className="text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Invalid link</h1>
          <p className="text-muted-foreground text-sm mb-6">No verification token found. Please check your email for the verification link.</p>
          <Link href="/auth/register" className="block w-full h-11 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors leading-[44px]" data-testid="link-register-again">
            Back to Registration
          </Link>
        </div>
      </div>
    );
  }

  if (verifyEmail.isPending) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm text-center">
          <Loader2 size={32} className="animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Verifying your email…</p>
        </div>
      </div>
    );
  }

  if (verifyEmail.isError) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle size={28} className="text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Verification failed</h1>
          <p className="text-muted-foreground text-sm mb-6">This link may have expired or already been used. Please register again to get a new link.</p>
          <Link href="/auth/register" className="block w-full h-11 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors leading-[44px]" data-testid="link-register-again">
            Register Again
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm text-center">
        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={28} className="text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Email verified!</h1>
        <p className="text-muted-foreground text-sm mb-6">Your account is now active. Sign in to start shopping.</p>
        <button
          onClick={() => setLocation("/auth/login")}
          className="w-full h-11 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors"
          data-testid="button-go-to-login"
        >
          Sign In
        </button>
      </div>
    </div>
  );
}
