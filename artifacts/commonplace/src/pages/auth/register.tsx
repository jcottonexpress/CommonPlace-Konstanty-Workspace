import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRegisterUser } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle } from "lucide-react";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const [submitted, setSubmitted] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const registerUser = useRegisterUser();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    registerUser.mutate({ data }, {
      onSuccess: () => setSubmitted(true),
      onError: () => {
        toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
      },
    });
  }

  if (submitted) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Check your email</h1>
          <p className="text-muted-foreground text-sm mb-6">
            If this email is not already registered, a verification link has been sent. Click the link in your email to activate your account, then sign in.
          </p>
          <button
            onClick={() => setLocation("/auth/login")}
            className="w-full h-11 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors"
            data-testid="button-go-to-login"
          >
            Go to Sign In
          </button>
          <p className="text-center text-xs text-muted-foreground mt-4">
            <Link href="/" className="hover:text-primary transition-colors" data-testid="link-guest">Continue as guest</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="font-display text-3xl text-primary">COMMONPLACE</Link>
          <h1 className="text-2xl font-bold mt-4 mb-1">Create your account</h1>
          <p className="text-muted-foreground text-sm">Start saving on everyday essentials</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" data-testid="form-register">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Full Name</label>
            <input {...register("name")} type="text" placeholder="Jane Smith"
              className="w-full h-11 px-4 border border-border rounded-xl text-sm focus:outline-none focus:border-primary bg-card"
              data-testid="input-name" />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Email</label>
            <input {...register("email")} type="email" placeholder="you@example.com"
              className="w-full h-11 px-4 border border-border rounded-xl text-sm focus:outline-none focus:border-primary bg-card"
              data-testid="input-email" />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Password</label>
            <input {...register("password")} type="password" placeholder="Min. 8 characters"
              className="w-full h-11 px-4 border border-border rounded-xl text-sm focus:outline-none focus:border-primary bg-card"
              data-testid="input-password" />
            {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
          </div>

          <button type="submit" disabled={registerUser.isPending}
            className="w-full h-11 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
            data-testid="button-submit-register">
            {registerUser.isPending ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-primary font-semibold hover:underline" data-testid="link-login">Sign in</Link>
        </p>
        <p className="text-center text-xs text-muted-foreground mt-3">
          <Link href="/" className="hover:text-primary transition-colors" data-testid="link-guest">Continue as guest</Link>
        </p>
      </div>
    </div>
  );
}
