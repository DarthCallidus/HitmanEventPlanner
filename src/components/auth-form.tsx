import { useState } from "react";
import { authClient, GROK_PROVIDERS, signIn } from "@/lib/auth/client";
import { claimFirstAdmin } from "@/lib/events/server";

export function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
          try {
            await claimFirstAdmin({ data: { email: email.trim().toLowerCase(), password } });
            const again = await authClient.signIn.email({
              email: email.trim(),
              password,
              callbackURL: "/",
            });
            if (!again.error) {
              window.location.assign("/");
              return;
            }
          } catch (reason) {
            const message = reason instanceof Error ? reason.message : "";
            if (message.includes("first login")) {
              setError(message);
              setPending(false);
              return;
            }
          }
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
        <div>
          <span className="mb-1.5 block text-sm text-muted">Password</span>
          <div className="password-field">
            <input
              className="field"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              minLength={8}
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((open) => !open)}
              aria-pressed={showPassword}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>
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