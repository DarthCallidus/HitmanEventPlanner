import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UserButton } from "@/lib/auth/gates";
import { AccountGate } from "@/components/account-gate";
import { errText } from "@/lib/events/format";
import { createLogin, deleteLogin, listAdmins, listClients, listDjs, listOperators, setLoginPassword } from "@/lib/events/server";
import type { ClientRow } from "@/lib/events/types";

export const Route = createFileRoute("/admin/people")({ component: PeoplePage });

type LoginRole = "admin" | "dj" | "client" | "operator";

function PeoplePage() {
  return (
    <AccountGate role="admin">
      {(profile) => <People selfId={profile.userId} />}
    </AccountGate>
  );
}

function suggestPassword() {
  const words = ["amber", "velvet", "maple", "harbor", "linen", "cedar", "ridge", "halo"];
  const pick = () => words[Math.floor(Math.random() * words.length)];
  return `${pick()}-${pick()}-${1000 + Math.floor(Math.random() * 9000)}`;
}

function People({ selfId }: { selfId: string }) {
  const [admins, setAdmins] = useState<ClientRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [djs, setDjs] = useState<ClientRow[]>([]);
  const [operators, setOperators] = useState<ClientRow[]>([]);
  const [error, setError] = useState("");
  const [made, setMade] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(suggestPassword);
  const [role, setRole] = useState<LoginRole>("client");
  const [busy, setBusy] = useState(false);

  function reload() {
    listAdmins().then(setAdmins).catch((reason) => setError(errText(reason)));
    listDjs().then(setDjs).catch((reason) => setError(errText(reason)));
    listOperators().then(setOperators).catch((reason) => setError(errText(reason)));
    listClients().then(setClients).catch((reason) => setError(errText(reason)));
  }

  useEffect(() => {
    reload();
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const created = await createLogin({ data: { name: name.trim(), email: email.trim(), password, role } });
      setMade(`${created.email} · ${password}`);
      setName("");
      setEmail("");
      setPassword(suggestPassword());
      reload();
    } catch (reason) {
      setError(errText(reason));
    } finally {
      setBusy(false);
    }
  }

  async function savePassword(userId: string, next: string) {
    await setLoginPassword({ data: { userId, password: next } });
    reload();
  }

  async function removeLogin(userId: string) {
    await deleteLogin({ data: { userId } });
    reload();
  }

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 py-6">
      <header className="safe-top">
        <div className="flex justify-end">
          <UserButton />
        </div>
        <Link to="/admin" className="text-sm text-faint">
          The book
        </Link>
        <h1 className="mt-2 font-display text-4xl">Logins</h1>
      </header>
      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      {made && (
        <p className="mt-4 rounded-2xl border border-line bg-surface p-4 text-sm">
          Login created. The password stays on this page.
          <span className="mt-1 block font-medium">{made}</span>
        </p>
      )}
      <form className="mt-8 space-y-3" onSubmit={(event) => void submit(event)}>
        <input className="field" placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} aria-label="Name" />
        <input className="field" type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} aria-label="Email" />
        <input className="field" value={password} onChange={(event) => setPassword(event.target.value)} aria-label="Password" />
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["admin", "Admin"],
              ["dj", "DJ"],
              ["operator", "Operator"],
              ["client", "Client"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={role === value ? "btn" : "btn-line"}
              onClick={() => setRole(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted">
          {role === "admin" && "Sees the book, contracts, and can delete."}
          {role === "dj" && "Only sees the events you assign."}
          {role === "operator" && "Only sees the 360 on the events you assign."}
          {role === "client" && "Only sees the event you assign. Assign them on the event."}
        </p>
        <button className="btn btn-block" disabled={busy} type="submit">
          {busy ? "Creating…" : "Create login"}
        </button>
      </form>
      <PeopleList title="Admins" empty="No admins yet." people={admins} selfId={selfId} onPassword={savePassword} onDelete={removeLogin} />
      <PeopleList title="DJs" empty="No DJs yet." people={djs} selfId={selfId} showEvent onPassword={savePassword} onDelete={removeLogin} />
      <PeopleList title="Operators" empty="No operators yet." people={operators} selfId={selfId} showEvent onPassword={savePassword} onDelete={removeLogin} />
      <PeopleList title="Clients" empty="No clients yet." people={clients} selfId={selfId} showEvent onPassword={savePassword} onDelete={removeLogin} />
    </main>
  );
}

function PeopleList({
  title,
  empty,
  people,
  showEvent = false,
  selfId,
  onPassword,
  onDelete,
}: {
  title: string;
  empty: string;
  people: ClientRow[];
  showEvent?: boolean;
  selfId: string;
  onPassword: (userId: string, password: string) => Promise<void>;
  onDelete: (userId: string) => Promise<void>;
}) {
  return (
    <section className="mt-8 space-y-2">
      <h2 className="font-display text-2xl">{title}</h2>
      {people.length === 0 ? (
        <p className="text-sm text-faint">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {people.map((person) => (
            <PersonCard key={person.userId} person={person} showEvent={showEvent} self={person.userId === selfId} onPassword={onPassword} onDelete={onDelete} />
          ))}
        </ul>
      )}
    </section>
  );
}

function PersonCard({
  person,
  showEvent,
  self,
  onPassword,
  onDelete,
}: {
  person: ClientRow;
  showEvent: boolean;
  self: boolean;
  onPassword: (userId: string, password: string) => Promise<void>;
  onDelete: (userId: string) => Promise<void>;
}) {
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onPassword(person.userId, next);
      setNext("");
    } catch (reason) {
      setError(errText(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-2xl border border-line bg-surface px-4 py-3">
      <p>{person.displayName}</p>
      <p className="text-sm text-faint">{person.email}</p>
      <p className="mt-2 text-sm">Password · {person.password || "Not on file"}</p>
      {showEvent && <p className="text-sm text-muted">{person.events.length ? person.events.join(", ") : "No event"}</p>}
      <form className="mt-3 flex gap-2" onSubmit={(event) => void save(event)}>
        <input className="field" value={next} onChange={(event) => setNext(event.target.value)} placeholder="New password" aria-label={`New password for ${person.displayName}`} />
        <button className="btn shrink-0" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Set"}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      {self ? (
        <p className="mt-3 text-sm text-faint">This is the login you are using.</p>
      ) : confirming ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-muted">Delete this login? The event stays.</p>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                setError("");
                void onDelete(person.userId)
                  .catch((reason) => setError(errText(reason)))
                  .finally(() => setBusy(false));
              }}
            >
              {busy ? "Deleting…" : "Delete login"}
            </button>
            <button type="button" className="btn-line" disabled={busy} onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn-line mt-3" onClick={() => setConfirming(true)}>
          Delete login
        </button>
      )}
    </li>
  );
}