import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth-form";
import { Splash } from "@/components/account-gate";
import { BrandLogo } from "@/components/brand-logo";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <Splash />;
  if (user) return <Navigate to="/" />;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-3 px-5 py-4">
      <h1 className="sr-only">Hitman Entertainment</h1>
      <BrandLogo size="hero" />
      <p className="text-center text-muted">Sign in to the wedding desk.</p>
      <div className="w-full">
        <AuthForm />
      </div>
    </main>
  );
}
