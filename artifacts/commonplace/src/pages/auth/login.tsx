import { useForm } from "react-hook-form";
import { Link, useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLoginUser } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCurrentUserQueryKey } from "@workspace/api-client-react";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password required"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const login = useLoginUser();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    login.mutate({ data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
        setLocation("/");
      },
      onError: () => {
        toast({ title: "Sign in failed", description: "Check your email and password.", variant: "destructive" });
      },
    });
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="font-display text-3xl text-primary">COMMONPLACE</Link>
          <h1 className="text-2xl font-bold mt-4 mb-1">Welcome back</h1>
          <p className="text-muted-foreground text-sm">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" data-testid="form-login">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Email</label>
            <input
              {...register("email")}
              type="email"
              placeholder="you@example.com"
              className="w-full h-11 px-4 border border-border rounded-xl text-sm focus:outline-none focus:border-primary bg-card"
              data-testid="input-email"
            />
            {errors.email && <p className="text-xs text-destructive mt-1" data-testid="error-email">{errors.email.message}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium">Password</label>
            </div>
            <input
              {...register("password")}
              type="password"
              placeholder="Your password"
              className="w-full h-11 px-4 border border-border rounded-xl text-sm focus:outline-none focus:border-primary bg-card"
              data-testid="input-password"
            />
            {errors.password && <p className="text-xs text-destructive mt-1" data-testid="error-password">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || login.isPending}
            className="w-full h-11 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
            data-testid="button-submit-login"
          >
            {login.isPending ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Don't have an account?{" "}
          <Link href="/auth/register" className="text-primary font-semibold hover:underline" data-testid="link-register">Create one free</Link>
        </p>

        <div className="mt-4 border-t border-border pt-4">
          <Link href="/" className="text-center block text-sm text-muted-foreground hover:text-primary transition-colors" data-testid="link-guest">
            Continue browsing as guest
          </Link>
        </div>
      </div>
    </div>
  );
}
