import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UserButton } from "@/lib/auth/gates";
import { AccountGate } from "@/components/account-gate";
import { errText } from "@/lib/events/format";
import { createClientAccount, createDjAccount, listClients, listDjs } from "@/lib/events/server";
import type { ClientRow } from "@/lib/events/types";

export const Route = createFileRoute("/admin/people")({ component: PeoplePage });

function PeoplePage() {
  return (
    <AccountGate role="admin">
      {() => <People />}
    </AccountGate>
  );
}

function suggestPassword() {
  const words = ["amber", "velvet", "maple", "harbor", "linen", "cedar", "ridge", "halo"];
  const pick = () => words[Math.floor(Math.random() * words.length)];
  return `${pick()}-${pick()}-${1000 + Math.floor(Math.random() * 9000)}`;
}

function People() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [djs, setDjs] = useState<ClientRow[]>([]);
  const [error, setError] = useState("");
  const [made, setMade] = useState("");

  function reload() {
    listClients().then(setClients).catch((reason) => setError(errText(reason)));
    listDjs().then(setDjs).catch((reason) => setError(errText(reason)));
  }

  useEffect(() => {
    reload();
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 py-6">
      <header className="safe-top">
        <div className="flex justify-end">
          <UserButton />
        </div>
        <Link to="/admin" className="text-sm text-faint">
          The book
        </Link>
        <h1 className="mt-2 font-display text-4xl">DJs and clients</h1>
      </header>
      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      {made && (
        <p className="mt-4 rounded-2xl border border-line bg-surface p-4 text-sm">
          Copy this now. The password is not shown again.
          <span className="mt-1 block font-medium">{made}</span>
        </p>
      )}
      <LoginForm
        title="DJs"
        hint="A DJ only sees the weddings you assign them."
        empty="No DJs yet."
        people={djs}
        onCreate={async (name, email, password) => {
          const created = await createDjAccount({ data: { name, email, password } });
          setMade(`${created.email} · ${password}`);
          reload();
        }}
      />
      <LoginForm
        title="Clients"
        hint="Create the login here. Assign it on the wedding."
        empty="No clients yet."
        people={clients}
        onCreate={async (name, email, password) => {
          const created = await createClientAccount({ data: { name, email, password, eventId: "" } });
          setMade(`${created.email} · ${password}`);
          reload();
        }}
      />
    </main>
  );
}

function LoginForm({
  title,
  hint,
  empty,
  people,
  onCreate,
}: {
  title: string;
  hint: string;
  empty: string;
  people: ClientRow[];
  onCreate: (name: string, email: string, password: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(suggestPassword);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onCreate(name.trim(), email.trim(), password);
      setName("");
      setEmail("");
      setPassword(suggestPassword());
    } catch (reason) {
      setError(errText(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 space-y-3">
      <h2 className="font-display text-2xl">{title}</h2>
      <p className="text-sm text-muted">{hint}</p>
      <form className="space-y-3" onSubmit={(event) => void submit(event)}>
        <input className="field" placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} aria-label={`${title} name`} />
        <input className="field" type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} aria-label={`${title} email`} />
        <input className="field" value={password} onChange={(event) => setPassword(event.target.value)} aria-label={`${title} password`} />
        <button className="btn btn-block" disabled={busy} type="submit">
          {busy ? "Creating…" : "Create login"}
        </button>
      </form>
      {error && <p className="text-sm text-danger">{error}</p>}
      {people.length === 0 ? (
        <p className="text-sm text-faint">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {people.map((person) => (
            <li key={person.userId} className="rounded-2xl border border-line bg-surface px-4 py-3">
              <p>{person.displayName}</p>
              <p className="text-sm text-faint">{person.email}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
