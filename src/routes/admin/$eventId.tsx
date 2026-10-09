import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UserButton } from "@/lib/auth/gates";
import { AccountGate } from "@/components/account-gate";
import { EventEditor } from "@/components/event-editor";
import { clearEventCache, fileToBase64, openPdf, writeCache } from "@/lib/events/cache";
import { downloadText, eventToCsv, eventToJson, fileBase } from "@/lib/events/export";
import { daysLabel, errText, formatLongDate, relativeTime } from "@/lib/events/format";
import {
  clearContractPdf,
  createClientAccount,
  deleteEvent,
  getContractPdf,
  getEvent,
  listClients,
  saveContractPdf,
  updateEventMeta,
} from "@/lib/events/server";
import { STATUS_LABEL, STATUSES, type ClientRow, type EventRecord, type EventStatus } from "@/lib/events/types";

export const Route = createFileRoute("/admin/$eventId")({ component: AdminEventPage });

function AdminEventPage() {
  const { eventId } = Route.useParams();
  return (
    <AccountGate role="admin">
      {() => <EventDesk eventId={eventId} />}
    </AccountGate>
  );
}

function suggestPassword() {
  const words = ["amber", "velvet", "maple", "harbor", "linen", "cedar", "ridge", "halo"];
  const pick = () => words[Math.floor(Math.random() * words.length)];
  return `${pick()}-${pick()}-${1000 + Math.floor(Math.random() * 9000)}`;
}

function EventDesk({ eventId }: { eventId: string }) {
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [venue, setVenue] = useState("");
  const [status, setStatus] = useState<EventStatus>("new");
  const [clientUserId, setClientUserId] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPassword, setClientPassword] = useState(suggestPassword);
  const [madeLogin, setMadeLogin] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [changesOpen, setChangesOpen] = useState(false);

  function apply(next: EventRecord) {
    setEvent(next);
    setTitle(next.title);
    setEventDate(next.eventDate ?? "");
    setVenue(next.venue);
    setStatus(next.status);
    setClientUserId(next.clientUserId ?? "");
    writeCache(next);
  }

  function reload() {
    getEvent({ data: { id: eventId } })
      .then(apply)
      .catch((reason) => setError(errText(reason)));
  }

  useEffect(() => {
    reload();
    listClients().then(setClients).catch(() => setClients([]));
  }, [eventId]);

  async function saveMeta(nextStatus = status, nextClient = clientUserId) {
    setBusy(true);
    setError("");
    try {
      await updateEventMeta({
        data: {
          id: eventId,
          title,
          eventDate,
          venue,
          status: nextStatus,
          clientUserId: nextClient || null,
        },
      });
      setNotice("Event info saved");
      reload();
    } catch (reason) {
      setError(errText(reason));
    } finally {
      setBusy(false);
    }
  }

  async function makeClient(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setBusy(true);
    setError("");
    try {
      const created = await createClientAccount({
        data: { name: clientName, email: clientEmail, password: clientPassword, eventId },
      });
      setMadeLogin(`${created.email} · ${clientPassword}`);
      setClientUserId(created.userId);
      setNotice("Client can sign in with that email and password");
      reload();
      listClients().then(setClients).catch(() => undefined);
    } catch (reason) {
      setError(errText(reason));
    } finally {
      setBusy(false);
    }
  }

  async function uploadContract(file: File) {
    setBusy(true);
    setError("");
    try {
      const base64 = await fileToBase64(file);
      await saveContractPdf({ data: { id: eventId, name: file.name, base64 } });
      setNotice("Contract uploaded");
      reload();
    } catch (reason) {
      setError(errText(reason));
    } finally {
      setBusy(false);
    }
  }

  async function openContract() {
    setError("");
    try {
      const file = await getContractPdf({ data: { id: eventId } });
      if (!file.base64) throw new Error("No contract on this wedding");
      openPdf(file.base64, file.name);
    } catch (reason) {
      setError(errText(reason));
    }
  }

  async function removeContract() {
    setBusy(true);
    setError("");
    try {
      await clearContractPdf({ data: { id: eventId } });
      setNotice("Contract removed");
      reload();
    } catch (reason) {
      setError(errText(reason));
    } finally {
      setBusy(false);
    }
  }

  async function removeEvent() {
    setBusy(true);
    setError("");
    try {
      await deleteEvent({ data: { id: eventId } });
      clearEventCache(eventId);
      await navigate({ to: "/admin" });
    } catch (reason) {
      setError(errText(reason));
      setBusy(false);
    }
  }

  if (!event && !error) {
    return (
      <main className="grid min-h-screen place-items-center">
        <p className="text-muted">Opening the event…</p>
      </main>
    );
  }
  if (!event) {
    return (
      <main className="mx-auto max-w-lg px-4 py-10">
        <p className="text-danger">{error}</p>
        <Link to="/admin" className="mt-4 inline-block text-accent">
          Back to the book
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 py-6">
      <header className="safe-top space-y-4">
        <div className="flex justify-end">
          <UserButton />
        </div>
        <div>
          <Link to="/admin" className="text-sm text-faint">
            The book
          </Link>
          <h1 className="font-display text-4xl">{event.details.day.coupleNames || event.title}</h1>
          <p className="text-muted">
            {formatLongDate(event.eventDate)} · {daysLabel(event.eventDate)}
          </p>
        </div>
      </header>

      <div className="mt-5 split">
        <Link to="/booth/$eventId" params={{ eventId }} className="btn">
          Step Into The Booth
        </Link>
        <button
          type="button"
          className="btn-line"
          disabled={busy}
          onClick={() => {
            const next = status === "locked" ? "planning" : "locked";
            setStatus(next);
            void saveMeta(next);
          }}
        >
          {status === "locked" ? "Unlock" : "Lock event"}
        </button>
      </div>
      {event.lockedAt && status === "locked" && (
        <p className="mt-2 text-sm text-faint">Locked {relativeTime(event.lockedAt)}. Clients can view, not edit.</p>
      )}

      <section className="mt-6 space-y-2">
        <p className="text-sm text-muted">Contract</p>
        <label className={busy ? "btn-line pointer-events-none opacity-70" : "btn-line"}>
          {event.contractPdfName ? "Replace the contract" : "Upload a contract"}
          <input
            className="sr-only"
            type="file"
            accept="application/pdf,.pdf"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void uploadContract(file);
            }}
          />
        </label>
        {event.contractPdfName && (
          <p className="flex items-center justify-between gap-3 text-sm">
            <button type="button" className="min-w-0 truncate text-left" onClick={() => void openContract()}>
              {event.contractPdfName}
            </button>
            <button type="button" className="text-faint" disabled={busy} onClick={() => void removeContract()}>
              Remove
            </button>
          </p>
        )}
      </section>

      <section className="mt-6 space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Event name</span>
          <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Date</span>
          <input className="field" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Venue</span>
          <input className="field" value={venue} onChange={(e) => setVenue(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Status</span>
          <select className="field" value={status} onChange={(e) => setStatus(e.target.value as EventStatus)}>
            {STATUSES.map((item) => (
              <option key={item} value={item}>
                {STATUS_LABEL[item]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Assigned client</span>
          <select className="field" value={clientUserId} onChange={(e) => setClientUserId(e.target.value)}>
            <option value="">No client login</option>
            {clients.map((client) => (
              <option key={client.userId} value={client.userId}>
                {client.displayName} · {client.email}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn btn-block" disabled={busy} onClick={() => saveMeta()}>
          Save event info
        </button>
        {notice && <p className="text-sm text-ok">{notice}</p>}
        {error && <p className="text-sm text-danger">{error}</p>}
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-display text-2xl">Client login</h2>
        <p className="text-sm text-muted">They only see this wedding. Hand them the password once.</p>
        <form className="space-y-3" onSubmit={makeClient}>
          <input className="field" placeholder="Client name" value={clientName} onChange={(e) => setClientName(e.target.value)} aria-label="Client name" />
          <input className="field" type="email" placeholder="Email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} aria-label="Client email" />
          <input className="field" value={clientPassword} onChange={(e) => setClientPassword(e.target.value)} aria-label="Temporary password" />
          <button className="btn-line btn-block" disabled={busy} type="submit">
            Create login and assign
          </button>
        </form>
        {madeLogin && (
          <p className="rounded-2xl border border-line bg-surface p-4 text-sm">
            Copy this now. Password is not shown again.
            <span className="mt-1 block font-medium text-fg">{madeLogin}</span>
          </p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-display text-2xl">Export</h2>
        <div className="mt-3 split-3">
          <button
            type="button"
            className="btn-line"
            onClick={() => downloadText(`${fileBase(event)}.csv`, eventToCsv(event), "text/csv")}
          >
            CSV
          </button>
          <button
            type="button"
            className="btn-line"
            onClick={() => downloadText(`${fileBase(event)}.json`, eventToJson(event), "application/json")}
          >
            JSON
          </button>
          <Link to="/brief/$eventId" params={{ eventId }} className="btn-line">
            PDF
          </Link>
        </div>
        <button
          type="button"
          className="btn-line btn-block mt-2"
          onClick={() => {
            writeCache(event);
            setNotice("Saved an offline copy on this phone");
          }}
        >
          Save offline copy
        </button>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 font-display text-2xl">Planning record</h2>
        <EventEditor event={event} readOnly={false} onSaved={reload} />
      </section>

      <section className="mt-10 mb-8">
        <button
          type="button"
          className="flex w-full items-center justify-between"
          aria-expanded={changesOpen}
          onClick={() => setChangesOpen((open) => !open)}
        >
          <h2 className="font-display text-2xl">Changes</h2>
          <span className="text-xl text-faint" aria-hidden>
            {changesOpen ? "▾" : "▸"}
          </span>
        </button>
        {changesOpen && (
          <div className="mt-3 space-y-3">
            {event.changes.length === 0 && <p className="text-sm text-faint">No edits yet.</p>}
            {event.changes.map((change) => (
              <div key={change.id} className="border-b border-line pb-3">
                <p>{change.summary}</p>
                <p className="text-sm text-faint">
                  {change.actorName} · {relativeTime(change.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12 mb-10 border-t border-line pt-8">
        <h2 className="font-display text-2xl">Delete event</h2>
        <p className="mt-2 text-sm text-muted">
          Removes this wedding from the book, Booth, and the client portal. The client login stays.
        </p>
        {confirmDelete ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-danger">This cannot be undone.</p>
            <button type="button" className="btn-danger btn-block" disabled={busy} onClick={() => void removeEvent()}>
              Delete forever
            </button>
            <button type="button" className="btn-line btn-block" disabled={busy} onClick={() => setConfirmDelete(false)}>
              Keep it
            </button>
            {error && <p className="text-sm text-danger">{error}</p>}
          </div>
        ) : (
          <button
            type="button"
            className="btn-danger btn-block mt-3"
            disabled={busy}
            onClick={() => setConfirmDelete(true)}
          >
            Delete event
          </button>
        )}
      </section>
    </main>
  );
}
