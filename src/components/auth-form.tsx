import { useState } from "react";
import { authClient, GROK_PROVIDERS, signIn } from "@/lib/auth/client";

export function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await authClient.signIn.email({
        email: email.trim(),
        password,
        callbackURL: "/",
      });
      if (result.error) {
        const detail = `${result.error.code ?? ""} ${result.error.message ?? ""}`;
        if (/invalid email or password/i.test(detail)) {
          setError("No account for that email, or the password is wrong.");
        } else {
          setError(result.error.message ?? "Sign-in failed");
        }
        setPending(false);
        return;
      }
      window.location.assign("/");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign-in failed");
      setPending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <form className="space-y-3" onSubmit={submit}>
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Email</span>
          <input
            className="field"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Password</span>
          <input
            className="field"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            minLength={8}
            required
          />
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button className="btn btn-block" type="submit" disabled={pending}>
          {pending ? "Working…" : "Enter"}
        </button>
      </form>
      <div className="mt-4 space-y-2">
        {GROK_PROVIDERS.map((provider) => (
          <button
            key={provider.providerId}
            type="button"
            className="btn-line btn-block"
            onClick={() => {
              setError(null);
              void signIn(provider.providerId, { callbackURL: "/" }).catch((reason) => {
                setError(reason instanceof Error ? reason.message : "Sign-in failed");
              });
            }}
          >
            Continue with {provider.label}
          </button>
        ))}
      </div>
    </div>
  );
}