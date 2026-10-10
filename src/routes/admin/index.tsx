import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { UserButton } from "@/lib/auth/gates";
import { AccountGate } from "@/components/account-gate";
import { BrandLogo } from "@/components/brand-logo";
import { buildSample } from "@/lib/events/sample";
import { fileToBase64 } from "@/lib/events/cache";
import { createEvent, listDjs, listEvents, saveContractPdf } from "@/lib/events/server";
import { daysLabel, daysUntil, errText, formatShortDate, relativeTime } from "@/lib/events/format";
import { STATUS_LABEL, type ClientRow, type EventStatus, type EventSummary } from "@/lib/events/types";

export const Route = createFileRoute("/admin/")({ component: AdminHome });

function AdminHome() {
  return (
    <AccountGate role="admin">
      {() => <Desk />}
    </AccountGate>
  );
}

function Desk() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventSummary[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [venue, setVenue] = useState("");
  const [contract, setContract] = useState<File | null>(null);
  const [djs, setDjs] = useState<ClientRow[]>([]);
  const [djUserId, setDjUserId] = useState("");
  const [busy, setBusy] = useState(false);

  function reload() {
    listEvents()
      .then(setEvents)
      .catch((reason) => setError(errText(reason)));
  }

  useEffect(() => {
    reload();
    listDjs().then(setDjs).catch(() => setDjs([]));
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (events ?? []).filter((event) => {
      if (!showArchived && event.status === "archived") return false;
      if (!q) return true;
      return [event.title, event.venue, event.couple, event.clientName ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [events, query, showArchived]);

  const today = visible.filter((event) => daysUntil(event.eventDate) === 0 && event.status !== "archived");
  const upcoming = visible
    .filter((event) => {
      const days = daysUntil(event.eventDate);
      return days === null || days >= 0;
    })
    .filter((event) => !today.some((item) => item.id === event.id));
  const past = visible.filter((event) => {
    const days = daysUntil(event.eventDate);
    return days !== null && days < 0;
  });

  async function onCreate(sample: boolean) {
    setBusy(true);
    setError("");
    try {
      const draft = sample
        ? { ...buildSample(), djUserId: null }
        : { title: title.trim(), eventDate, venue, status: "new" as const, details: {}, djUserId: djUserId || null };
      if (!sample && !draft.title) {
        setError("Name the wedding");
        setBusy(false);
        return;
      }
      const created = await createEvent({ data: draft });
      if (!sample && contract) {
        const base64 = await fileToBase64(contract);
        await saveContractPdf({ data: { id: created.id, name: contract.name, base64 } });
      }
      if (sample) {
        await navigate({ to: "/booth/$eventId", params: { eventId: created.id } });
        return;
      }
      await navigate({ to: "/admin/$eventId", params: { eventId: created.id } });
    } catch (reason) {
      setError(errText(reason));
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 py-6">
      <header className="safe-top space-y-4">
        <div className="flex justify-end">
          <UserButton />
        </div>
        <div className="flex justify-center">
          <BrandLogo size="header" />
        </div>
        <h1 className="text-center font-display text-4xl">The book</h1>
      </header>

      {today.map((event) => (
        <section key={event.id} className="mt-6 rounded-2xl border border-accent bg-surface p-5">
          <p className="text-sm uppercase tracking-widest text-accent">Today's event</p>
          <h2 className="mt-2 font-display text-3xl">{event.couple || event.title}</h2>
          <p className="text-muted">{event.venue}</p>
          <Link to="/booth/$eventId" params={{ eventId: event.id }} className="btn btn-block mt-4">
            Step Into The Booth
          </Link>
        </section>
      ))}

      <div className="mt-6 space-y-3">
        <input
          className="field"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search couples, venues, clients"
          aria-label="Search events"
        />
        <div className="split">
          <button type="button" className="btn" onClick={() => setCreating((v) => !v)}>
            New event
          </button>
          <button type="button" className="btn-line" disabled={busy} onClick={() => onCreate(true)}>
            {busy ? "Opening…" : "Sample Booth"}
          </button>
        </div>
        <Link to="/admin/people" className="btn-line btn-block">
          DJs and clients
        </Link>
        {creating && (
          <form
            className="space-y-3 rounded-2xl border border-line bg-surface p-4"
            onSubmit={(e) => {
              e.preventDefault();
              void onCreate(false);
            }}
          >
            <input className="field" placeholder="Smith Wedding" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Event name" />
            <input className="field" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} aria-label="Event date" />
            <input className="field" placeholder="Venue" value={venue} onChange={(e) => setVenue(e.target.value)} aria-label="Venue" />
            <label className="btn-line">
              {contract ? contract.name : "Upload a contract"}
              <input
                className="sr-only"
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setContract(e.target.files?.[0] ?? null)}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-muted">Assigned DJ</span>
              <select className="field" value={djUserId} onChange={(e) => setDjUserId(e.target.value)} aria-label="Assigned DJ">
                <option value="">No DJ yet</option>
                {djs.map((dj) => (
                  <option key={dj.userId} value={dj.userId}>
                    {dj.displayName} · {dj.email}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn btn-block" disabled={busy} type="submit">
              Create event
            </button>
          </form>
        )}
        <button type="button" className="text-sm text-faint" onClick={() => setShowArchived((v) => !v)}>
          {showArchived ? "Hide archived" : "Show archived"}
        </button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>

      {!events && <p className="mt-8 text-muted">Loading the book…</p>}
      {events && visible.length === 0 && (
        <p className="mt-8 text-muted">No weddings yet. Create one, or open the sample and walk Booth.</p>
      )}

      <EventGroup label="Upcoming" events={upcoming} />
      <EventGroup label="Past" events={past} />
    </main>
  );
}

function EventGroup({ label, events }: { label: string; events: EventSummary[] }) {
  if (!events.length) return null;
  return (
    <section className="mt-8 space-y-3">
      <h2 className="text-sm uppercase tracking-widest text-faint">{label}</h2>
      {events.map((event) => (
        <Link
          key={event.id}
          to="/admin/$eventId"
          params={{ eventId: event.id }}
          className="block rounded-2xl border border-line bg-surface p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm tabular-nums text-accent">{formatShortDate(event.eventDate)}</p>
            <StatusChip status={event.status} />
          </div>
          <h3 className="mt-2 font-display text-2xl">{event.title}</h3>
          <p className="text-muted">{event.couple && event.couple !== event.title ? event.couple : event.venue}</p>
          <p className="mt-1 text-sm text-faint">{event.venue}</p>
          <div className="mt-4 h-1 overflow-hidden rounded-full bg-bg">
            <div className="h-full bg-accent" style={{ width: `${event.percent}%` }} />
          </div>
          <p className="mt-2 text-sm text-faint">
            {event.percent}% · {daysLabel(event.eventDate)}
            {event.updatedAt ? ` · updated ${relativeTime(event.updatedAt)}` : ""}
          </p>
          {event.missing.length > 0 && event.missing.length < 8 && (
            <p className="mt-1 text-sm text-muted">Open: {event.missing.slice(0, 3).join(", ")}</p>
          )}
        </Link>
      ))}
    </section>
  );
}

function StatusChip({ status }: { status: EventStatus }) {
  const tone =
    status === "ready" ? "text-ok" : status === "needs_info" ? "text-danger" : status === "locked" ? "text-accent" : "";
  return <span className={`chip ${tone}`}>{STATUS_LABEL[status]}</span>;
}
