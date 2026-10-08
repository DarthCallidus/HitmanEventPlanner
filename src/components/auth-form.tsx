import { useState } from "react";
import { authClient, GROK_PROVIDERS, signIn } from "@/lib/auth/client";

export function AuthForm() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result =
        mode === "up"
          ? await authClient.signUp.email({
              name: name.trim() || "Admin",
              email: email.trim(),
              password,
              callbackURL: "/",
            })
          : await authClient.signIn.email({
              email: email.trim(),
              password,
              callbackURL: "/",
            });
      if (result.error) {
        const detail = `${result.error.code ?? ""} ${result.error.message ?? ""}`;
        if (mode === "in" && /invalid email or password/i.test(detail)) {
          setError("No account for that email, or the password is wrong. First time? Tap Create account.");
        } else if (/user already exists|already exists/i.test(detail)) {
          setError("That email already has an account. Switch to Sign in.");
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
      <div className="split">
        <button
          type="button"
          className={mode === "in" ? "btn" : "btn-line"}
          onClick={() => setMode("in")}
        >
          Sign in
        </button>
        <button
          type="button"
          className={mode === "up" ? "btn" : "btn-line"}
          onClick={() => setMode("up")}
        >
          Create account
        </button>
      </div>
      <form className="mt-4 space-y-3" onSubmit={submit}>
        {mode === "up" && (
          <label className="block">
            <span className="mb-1.5 block text-sm text-muted">Your name</span>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </label>
        )}
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
            autoComplete={mode === "up" ? "new-password" : "current-password"}
            minLength={8}
            required
          />
        </label>
        {mode === "in" ? (
          <p className="text-sm text-faint">
            First time here? Tap Create account. Password needs 8 characters.
          </p>
        ) : (
          <p className="text-sm text-faint">
            The first account becomes admin. Clients get their own login from the event.
          </p>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
        <button className="btn btn-block" type="submit" disabled={pending}>
          {pending ? "Working…" : mode === "up" ? "Create admin account" : "Enter"}
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
