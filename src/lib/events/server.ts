import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { scoreDetails } from "./completion";
import { asStatus, normalizeDetails, rid } from "./defaults";
import type {
  ChangeRow,
  ClientRow,
  EventRecord,
  EventStatus,
  EventSummary,
  Profile,
  SectionId,
} from "./types";
import { SECTIONS, STATUSES } from "./types";

type ProfileRow = {
  user_id: string;
  role: string;
  display_name: string;
  email: string | null;
};

async function ensureProfile(userId: string): Promise<Profile> {
  const sql = await getSql();
  const users = await sql<{ name: string; email: string }>`
    select name, email from "user" where id = ${userId}
  `;
  const name = users[0]?.name?.trim() || "Account";
  const email = users[0]?.email ?? "";
  await sql`
    insert into profiles (user_id, role, display_name)
    select ${userId},
      case when exists (select 1 from profiles where role = 'admin') then 'client' else 'admin' end,
      ${name}
    where not exists (select 1 from profiles where user_id = ${userId})
  `;
  const rows = await sql<ProfileRow>`
    select p.user_id, p.role, p.display_name, u.email
    from profiles p
    left join "user" u on u.id = p.user_id
    where p.user_id = ${userId}
  `;
  const row = rows[0];
  if (!row) throw new Error("Could not open your account");
  return {
    userId: row.user_id,
    role: row.role === "admin" ? "admin" : row.role === "dj" ? "dj" : row.role === "operator" ? "operator" : "client",
    displayName: row.display_name || name,
    email: row.email ?? email,
  };
}

function assertAdmin(profile: Profile) {
  if (profile.role !== "admin") throw new Error("Admin only");
}

async function writeDjs(eventId: string, ids: string[]) {
  const sql = await getSql();
  if (ids.length) {
    for (const id of ids) {
      const found = await sql<{ user_id: string }>`
        select user_id from profiles where user_id = ${id} and role = 'dj'
      `;
      if (!found[0]) throw new Error("That DJ account was not found");
    }
  }
  await sql`delete from event_djs where event_id = ${eventId}`;
  for (const id of ids) {
    await sql`insert into event_djs (event_id, user_id) values (${eventId}, ${id})`;
  }
}

async function writeOperators(eventId: string, ids: string[]) {
  const sql = await getSql();
  for (const id of ids) {
    const found = await sql<{ user_id: string }>`
      select user_id from profiles where user_id = ${id} and role = 'operator'
    `;
    if (!found[0]) throw new Error("That operator account was not found");
  }
  await sql`delete from event_operators where event_id = ${eventId}`;
  for (const id of ids) {
    await sql`insert into event_operators (event_id, user_id) values (${eventId}, ${id})`;
  }
}

function djIdsInput(raw: Record<string, unknown>): string[] {
  const listed = Array.isArray(raw.djUserIds)
    ? raw.djUserIds.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : [];
  const single = typeof raw.djUserId === "string" ? raw.djUserId.trim() : "";
  return [...new Set(listed.length ? listed : single ? [single] : [])];
}

function stamp(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return value == null ? "" : String(value);
}

function day(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date) return stamp(value).slice(0, 10);
  return String(value).slice(0, 10);
}

type EventRow = {
  id: string;
  title: string;
  event_date: unknown;
  venue: string;
  status: string;
  locked_at: unknown;
  created_at: unknown;
  updated_at: unknown;
  created_by: string;
  client_user_id: string | null;
  client_name: string | null;
  dj_user_id?: string | null;
  dj_ids?: string | null;
  dj_name?: string | null;
  booth_notes: string | null;
  contract_pdf_name?: string | null;
  details: unknown;
};

function djIdsFrom(row: EventRow): string[] {
  const extra = (row.dj_ids ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const first = row.dj_user_id ? [row.dj_user_id] : [];
  return [...new Set([...first, ...extra])];
}

function summaryFrom(row: EventRow): EventSummary {
  const details = normalizeDetails(row.details);
  const scored = scoreDetails(details, row.venue);
  const ids = djIdsFrom(row);
  return {
    id: row.id,
    title: row.title,
    eventDate: day(row.event_date),
    venue: row.venue,
    status: asStatus(row.status),
    updatedAt: stamp(row.updated_at),
    clientUserId: row.client_user_id,
    clientName: row.client_name,
    djUserId: ids[0] ?? null,
    djUserIds: ids,
    djName: row.dj_name ?? null,
    couple: details.kind === "other" ? "" : details.day.coupleNames,
    kind: details.kind,
    percent: scored.percent,
    missing: scored.missing,
  };
}

let fileColumnsReady: Promise<void> | null = null;

function ensureFileColumns() {
  fileColumnsReady ??= (async () => {
    try {
      const sql = await getSql();
      await sql`alter table events add column if not exists timeline_pdf bytea`;
      await sql`alter table events add column if not exists timeline_pdf_name text not null default ''`;
      await sql`alter table events add column if not exists contract_pdf bytea`;
      await sql`alter table events add column if not exists contract_pdf_name text not null default ''`;
      await sql`alter table events add column if not exists dj_user_id text`;
      await sql`alter table profiles add column if not exists issued_password text not null default ''`;
      await sql`
        create table if not exists event_djs (
          event_id text not null references events (id) on delete cascade,
          user_id text not null,
          primary key (event_id, user_id)
        )
      `;
      await sql`
        create table if not exists event_operators (
          event_id text not null references events (id) on delete cascade,
          user_id text not null,
          primary key (event_id, user_id)
        )
      `;
      await sql`alter table profiles drop constraint if exists profiles_role_check`;
      await sql`alter table profiles add constraint profiles_role_check check (role in ('admin', 'client', 'dj', 'operator'))`;
    } catch (error) {
      fileColumnsReady = null;
      throw error;
    }
  })();
  return fileColumnsReady;
}

async function loadEvent(id: string, profile: Profile): Promise<EventRow> {
  await ensureFileColumns();
  const sql = await getSql();
  const rows = await sql<EventRow>`
    select e.id, e.title, e.event_date, e.venue, e.status, e.locked_at, e.created_at,
           e.updated_at, e.created_by, e.client_user_id, e.dj_user_id, e.booth_notes, e.contract_pdf_name, e.details,
           p.display_name as client_name, d.display_name as dj_name,
           (select string_agg(ed.user_id, ',') from event_djs ed where ed.event_id = e.id) as dj_ids
    from events e
    left join profiles p on p.user_id = e.client_user_id
    left join profiles d on d.user_id = e.dj_user_id
    where e.id = ${id}
      and (
        ${profile.role} = 'admin'
        or (${profile.role} = 'client' and e.client_user_id = ${profile.userId})
        or (
          ${profile.role} = 'dj'
          and (
            e.dj_user_id = ${profile.userId}
            or exists (select 1 from event_djs ed where ed.event_id = e.id and ed.user_id = ${profile.userId})
          )
        )
        or (
          ${profile.role} = 'operator'
          and exists (select 1 from event_operators eo where eo.event_id = e.id and eo.user_id = ${profile.userId})
        )
      )
  `;
  const row = rows[0];
  if (!row) throw new Error("Event not found");
  return row;
}

async function logChange(eventId: string, profile: Profile, summary: string) {
  const sql = await getSql();
  await sql`
    insert into event_changes (id, event_id, user_id, actor_name, summary)
    values (${rid()}, ${eventId}, ${profile.userId}, ${profile.displayName}, ${summary})
  `;
}

function sectionLabel(id: string): string {
  return SECTIONS.find((section) => section.id === id)?.label ?? "Event";
}

async function recordFrom(row: EventRow, profile: Profile): Promise<EventRecord> {
  const sql = await getSql();
  let changes: ChangeRow[] = [];
  if (profile.role === "admin") {
    const logs = await sql<{ id: string; summary: string; actor_name: string; created_at: unknown }>`
      select id, summary, actor_name, created_at
      from event_changes
      where event_id = ${row.id}
      order by created_at desc
      limit 30
    `;
    changes = logs.map((log) => ({
      id: log.id,
      summary: log.summary,
      actorName: log.actor_name,
      createdAt: stamp(log.created_at),
    }));
  }
  const operators = await sql<{ user_id: string }>`
    select user_id from event_operators where event_id = ${row.id}
  `;
  return {
    ...summaryFields(row),
    lockedAt: row.locked_at ? stamp(row.locked_at) : null,
    createdAt: stamp(row.created_at),
    createdBy: row.created_by,
    boothNotes: row.booth_notes ?? "",
    contractPdfName: profile.role === "dj" || profile.role === "operator" ? "" : (row.contract_pdf_name ?? ""),
    operatorUserIds: operators.map((item) => item.user_id),
    details: normalizeDetails(row.details),
    changes,
  };
}

function summaryFields(row: EventRow) {
  const summary = summaryFrom(row);
  return {
    id: summary.id,
    title: summary.title,
    eventDate: summary.eventDate,
    venue: summary.venue,
    status: summary.status,
    updatedAt: summary.updatedAt,
    clientUserId: summary.clientUserId,
    clientName: summary.clientName,
    djUserId: summary.djUserId,
    djUserIds: summary.djUserIds,
    djName: summary.djName,
  };
}

function pdfBytes(value: unknown): Uint8Array | null {
  if (!value) return null;
  if (value instanceof Uint8Array) return value;
  if (typeof value === "string" && value.startsWith("\\x")) {
    const hex = value.slice(2);
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    return out;
  }
  return null;
}

export const getMe = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => ensureProfile(context.userId));

export const listEvents = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<EventSummary[]> => {
    const profile = await ensureProfile(context.userId);
    await ensureFileColumns();
    const sql = await getSql();
    const rows = await sql<EventRow>`
      select e.id, e.title, e.event_date, e.venue, e.status, e.locked_at, e.created_at,
             e.updated_at, e.created_by, e.client_user_id, e.dj_user_id, e.booth_notes, e.details,
             p.display_name as client_name, d.display_name as dj_name,
             (select string_agg(ed.user_id, ',') from event_djs ed where ed.event_id = e.id) as dj_ids
      from events e
      left join profiles p on p.user_id = e.client_user_id
      left join profiles d on d.user_id = e.dj_user_id
      where ${profile.role} = 'admin'
         or (${profile.role} = 'client' and e.client_user_id = ${profile.userId})
         or (
           ${profile.role} = 'dj'
           and (
             e.dj_user_id = ${profile.userId}
             or exists (select 1 from event_djs ed where ed.event_id = e.id and ed.user_id = ${profile.userId})
           )
         )
         or (
           ${profile.role} = 'operator'
           and exists (select 1 from event_operators eo where eo.event_id = e.id and eo.user_id = ${profile.userId})
         )
      order by e.event_date asc nulls last, e.created_at asc
    `;
    return rows.map(summaryFrom);
  });

export const getEvent = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const id = typeof (input as { id?: unknown })?.id === "string" ? (input as { id: string }).id : "";
    if (!id) throw new Error("Missing event");
    return { id };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<EventRecord> => {
    const profile = await ensureProfile(context.userId);
    const row = await loadEvent(data.id, profile);
    return recordFrom(row, profile);
  });

type CreateInput = {
  title: string;
  eventDate: string;
  venue: string;
  status: EventStatus;
  details: unknown;
  djUserIds: string[];
  kind: "wedding" | "other";
};

export const createEvent = createServerFn({ method: "POST" })
  .validator((input: unknown): CreateInput => {
    const raw = (input ?? {}) as Record<string, unknown>;
    const title = typeof raw.title === "string" ? raw.title.trim() : "";
    if (!title) throw new Error("Give the event a name");
    const eventDate = typeof raw.eventDate === "string" ? raw.eventDate.trim() : "";
    const venue = typeof raw.venue === "string" ? raw.venue.trim() : "";
    const status = asStatus(raw.status ?? "new");
    if (!(STATUSES as readonly string[]).includes(status)) throw new Error("Bad status");
    const kind = raw.kind === "other" ? "other" : "wedding";
    return { title, eventDate, venue, status, details: raw.details ?? {}, djUserIds: djIdsInput(raw), kind };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const profile = await ensureProfile(context.userId);
    assertAdmin(profile);
    await ensureFileColumns();
    const details = normalizeDetails({ ...(typeof data.details === "object" && data.details ? data.details : {}), kind: data.kind });
    const id = rid();
    const sql = await getSql();
    const lockedAt = data.status === "locked" ? new Date().toISOString() : null;
    await sql`
      insert into events (
        id, created_by, title, event_date, venue, status, locked_at, details, dj_user_id
      ) values (
        ${id},
        ${profile.userId},
        ${data.title},
        ${data.eventDate || null},
        ${data.venue},
        ${data.status},
        ${lockedAt},
        ${JSON.stringify(details)}::jsonb,
        ${data.djUserIds[0] ?? null}
      )
    `;
    await writeDjs(id, data.djUserIds);
    await logChange(id, profile, "Created the event");
    return { id };
  });

type MetaInput = {
  id: string;
  title: string;
  eventDate: string;
  venue: string;
  status: EventStatus;
  clientUserId: string | null;
  djUserIds: string[];
  booth360: boolean;
  operatorUserIds: string[];
};

export const updateEventMeta = createServerFn({ method: "POST" })
  .validator((input: unknown): MetaInput => {
    const raw = (input ?? {}) as Record<string, unknown>;
    const id = typeof raw.id === "string" ? raw.id : "";
    const title = typeof raw.title === "string" ? raw.title.trim() : "";
    if (!id || !title) throw new Error("Event name is required");
    const client = typeof raw.clientUserId === "string" ? raw.clientUserId.trim() : "";
    return {
      id,
      title,
      eventDate: typeof raw.eventDate === "string" ? raw.eventDate.trim() : "",
      venue: typeof raw.venue === "string" ? raw.venue.trim() : "",
      status: asStatus(raw.status),
      clientUserId: client || null,
      djUserIds: djIdsInput(raw),
      booth360: raw.booth360 === true,
      operatorUserIds: [...new Set(
        Array.isArray(raw.operatorUserIds)
          ? raw.operatorUserIds.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
          : [],
      )],
    };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const profile = await ensureProfile(context.userId);
    assertAdmin(profile);
    const existing = await loadEvent(data.id, profile);
    const sql = await getSql();
    if (data.clientUserId) {
      const clients = await sql<{ user_id: string }>`
        select user_id from profiles where user_id = ${data.clientUserId} and role = 'client'
      `;
      if (!clients[0]) throw new Error("That client account was not found");
    }
    await writeDjs(data.id, data.djUserIds);
    await writeOperators(data.id, data.operatorUserIds);
    const lockedAt =
      data.status === "locked"
        ? existing.locked_at
          ? stamp(existing.locked_at)
          : new Date().toISOString()
        : null;
    const details = normalizeDetails(existing.details);
    details.booth360 = { ...details.booth360, enabled: data.booth360 };
    await sql`
      update events
      set title = ${data.title},
          event_date = ${data.eventDate || null},
          venue = ${data.venue},
          status = ${data.status},
          client_user_id = ${data.clientUserId},
          dj_user_id = ${data.djUserIds[0] ?? null},
          details = ${JSON.stringify(details)}::jsonb,
          locked_at = ${lockedAt},
          updated_at = now()
      where id = ${data.id}
    `;
    await logChange(data.id, profile, `Updated event info · ${data.status}`);
    return { ok: true };
  });

export const deleteLogin = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const userId = typeof (input as { userId?: unknown })?.userId === "string" ? (input as { userId: string }).userId : "";
    if (!userId) throw new Error("Missing account");
    return { userId };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const profile = await ensureProfile(context.userId);
    assertAdmin(profile);
    if (data.userId === profile.userId) throw new Error("You cannot delete the login you are using");
    await ensureFileColumns();
    const sql = await getSql();
    const rows = await sql<{ role: string }>`select role from profiles where user_id = ${data.userId}`;
    const target = rows[0];
    if (!target) throw new Error("That account was not found");
    if (target.role === "admin") {
      const admins = await sql<{ user_id: string }>`select user_id from profiles where role = 'admin'`;
      if (admins.length <= 1) throw new Error("Keep at least one admin");
    }
    await sql`update events set client_user_id = null, updated_at = now() where client_user_id = ${data.userId}`;
    await sql`delete from event_djs where user_id = ${data.userId}`;
    await sql`delete from event_operators where user_id = ${data.userId}`;
    const primary = await sql<{ id: string }>`select id from events where dj_user_id = ${data.userId}`;
    for (const event of primary) {
      const rest = await sql<{ user_id: string }>`select user_id from event_djs where event_id = ${event.id} limit 1`;
      await sql`update events set dj_user_id = ${rest[0]?.user_id ?? null}, updated_at = now() where id = ${event.id}`;
    }
    await sql`delete from profiles where user_id = ${data.userId}`;
    await sql`delete from "user" where id = ${data.userId}`;
    return { ok: true };
  });

export const deleteEvent = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const id = typeof (input as { id?: unknown })?.id === "string" ? (input as { id: string }).id : "";
    if (!id) throw new Error("Missing event");
    return { id };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const profile = await ensureProfile(context.userId);
    assertAdmin(profile);
    await loadEvent(data.id, profile);
    const sql = await getSql();
    await sql`delete from events where id = ${data.id}`;
    return { ok: true };
  });

export const saveDetails = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const raw = (input ?? {}) as Record<string, unknown>;
    const id = typeof raw.id === "string" ? raw.id : "";
    const section = typeof raw.section === "string" ? raw.section : "notes";
    if (!id) throw new Error("Missing event");
    const encoded = JSON.stringify(raw.details ?? {});
    if (encoded.length > 500_000) throw new Error("That event is too large to save");
    return { id, section: section as SectionId, details: raw.details };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const profile = await ensureProfile(context.userId);
    const existing = await loadEvent(data.id, profile);
    if (profile.role === "dj" || profile.role === "operator") throw new Error("You can read this event. Ask the admin to change it.");
    if (profile.role !== "admin" && (existing.status === "locked" || existing.locked_at)) {
      throw new Error("This event is locked. Ask your DJ to unlock it.");
    }
    const details = normalizeDetails(data.details);
    const sql = await getSql();
    const nextStatus = profile.role === "client" && existing.status === "new" ? "planning" : existing.status;
    await sql`
      update events
      set details = ${JSON.stringify(details)}::jsonb,
          status = ${nextStatus},
          updated_at = now()
      where id = ${data.id}
    `;
    await logChange(data.id, profile, `Updated ${sectionLabel(data.section)}`);
    return { ok: true, updatedAt: new Date().toISOString() };
  });

export const getTimelinePdf = createServerFn({ method: "GET" })
  .validator((input: unknown) => {
    const id = typeof (input as { id?: unknown })?.id === "string" ? (input as { id: string }).id : "";
    if (!id) throw new Error("Missing event");
    return { id };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const profile = await ensureProfile(context.userId);
    await loadEvent(data.id, profile);
    const sql = await getSql();
    const rows = await sql<{ timeline_pdf: Uint8Array | null; timeline_pdf_name: string }>`
      select timeline_pdf, timeline_pdf_name from events where id = ${data.id}
    `;
    const row = rows[0];
    const bytes = pdfBytes(row?.timeline_pdf);
    if (!bytes || !row?.timeline_pdf_name) return { name: "", base64: "" };
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return { name: row.timeline_pdf_name, base64: btoa(binary) };
  });

export const saveTimelinePdf = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const raw = (input ?? {}) as Record<string, unknown>;
    const id = typeof raw.id === "string" ? raw.id : "";
    const name = typeof raw.name === "string" ? raw.name.trim().slice(0, 180) : "";
    const base64 = typeof raw.base64 === "string" ? raw.base64 : "";
    if (!id) throw new Error("Missing event");
    if (!name || !base64) throw new Error("Choose a PDF");
    return { id, name, base64 };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const profile = await ensureProfile(context.userId);
    const existing = await loadEvent(data.id, profile);
    if (profile.role === "dj" || profile.role === "operator") throw new Error("You can read this event. Ask the admin to change it.");
    if (profile.role !== "admin" && (existing.status === "locked" || existing.locked_at)) {
      throw new Error("This event is locked. Ask your DJ to unlock it.");
    }
    const bytes = Buffer.from(data.base64, "base64");
    if (bytes.length > 6_000_000) throw new Error("That PDF is too large");
    if (bytes.subarray(0, 4).toString() !== "%PDF") throw new Error("That file is not a PDF");
    const sql = await getSql();
    await sql`
      update events
      set timeline_pdf = ${bytes}, timeline_pdf_name = ${data.name}, updated_at = now()
      where id = ${data.id}
    `;
    await logChange(data.id, profile, "Uploaded the timeline PDF");
    return { name: data.name };
  });

export const clearTimelinePdf = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const id = typeof (input as { id?: unknown })?.id === "string" ? (input as { id: string }).id : "";
    if (!id) throw new Error("Missing event");
    return { id };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const profile = await ensureProfile(context.userId);
    const existing = await loadEvent(data.id, profile);
    if (profile.role === "dj" || profile.role === "operator") throw new Error("You can read this event. Ask the admin to change it.");
    if (profile.role !== "admin" && (existing.status === "locked" || existing.locked_at)) {
      throw new Error("This event is locked. Ask your DJ to unlock it.");
    }
    const sql = await getSql();
    await sql`
      update events
      set timeline_pdf = null, timeline_pdf_name = '', updated_at = now()
      where id = ${data.id}
    `;
    await logChange(data.id, profile, "Removed the timeline PDF");
    return { ok: true };
  });

export const getContractPdf = createServerFn({ method: "GET" })
  .validator((input: unknown) => {
    const id = typeof (input as { id?: unknown })?.id === "string" ? (input as { id: string }).id : "";
    if (!id) throw new Error("Missing event");
    return { id };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const profile = await ensureProfile(context.userId);
    if (profile.role === "dj" || profile.role === "operator") throw new Error("Contracts stay with the admin and the couple.");
    await loadEvent(data.id, profile);
    const sql = await getSql();
    const rows = await sql<{ contract_pdf: unknown; contract_pdf_name: string }>`
      select contract_pdf, contract_pdf_name from events where id = ${data.id}
    `;
    const row = rows[0];
    const bytes = pdfBytes(row?.contract_pdf);
    if (!bytes || !row?.contract_pdf_name) return { name: "", base64: "" };
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return { name: row.contract_pdf_name, base64: btoa(binary) };
  });

export const saveContractPdf = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const raw = (input ?? {}) as Record<string, unknown>;
    const id = typeof raw.id === "string" ? raw.id : "";
    const name = typeof raw.name === "string" ? raw.name.trim().slice(0, 180) : "";
    const base64 = typeof raw.base64 === "string" ? raw.base64 : "";
    if (!id) throw new Error("Missing event");
    if (!name || !base64) throw new Error("Choose a PDF");
    return { id, name, base64 };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const profile = await ensureProfile(context.userId);
    assertAdmin(profile);
    await loadEvent(data.id, profile);
    const bytes = Buffer.from(data.base64, "base64");
    if (bytes.length > 6_000_000) throw new Error("That PDF is too large");
    if (bytes.subarray(0, 4).toString() !== "%PDF") throw new Error("That file is not a PDF");
    const sql = await getSql();
    await sql`
      update events
      set contract_pdf = ${bytes}, contract_pdf_name = ${data.name}, updated_at = now()
      where id = ${data.id}
    `;
    await logChange(data.id, profile, "Uploaded the contract");
    return { name: data.name };
  });

export const clearContractPdf = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const id = typeof (input as { id?: unknown })?.id === "string" ? (input as { id: string }).id : "";
    if (!id) throw new Error("Missing event");
    return { id };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const profile = await ensureProfile(context.userId);
    assertAdmin(profile);
    await loadEvent(data.id, profile);
    const sql = await getSql();
    await sql`
      update events
      set contract_pdf = null, contract_pdf_name = '', updated_at = now()
      where id = ${data.id}
    `;
    await logChange(data.id, profile, "Removed the contract");
    return { ok: true };
  });

export const saveBoothNotes = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const raw = (input ?? {}) as Record<string, unknown>;
    const id = typeof raw.id === "string" ? raw.id : "";
    const boothNotes = typeof raw.boothNotes === "string" ? raw.boothNotes.slice(0, 8000) : "";
    if (!id) throw new Error("Missing event");
    return { id, boothNotes };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const profile = await ensureProfile(context.userId);
    if (profile.role === "client" || profile.role === "operator") throw new Error("Admin only");
    await loadEvent(data.id, profile);
    const sql = await getSql();
    await sql`
      update events
      set booth_notes = ${data.boothNotes}, updated_at = now()
      where id = ${data.id}
    `;
    await logChange(data.id, profile, "Updated booth notes");
    return { ok: true };
  });

async function listAccounts(role: "admin" | "client" | "dj" | "operator"): Promise<ClientRow[]> {
  await ensureFileColumns();
  const sql = await getSql();
  const rows = await sql<{ user_id: string; display_name: string; email: string; issued_password: string | null }>`
    select p.user_id, p.display_name, u.email, p.issued_password
    from profiles p
    join "user" u on u.id = p.user_id
    where p.role = ${role}
    order by p.display_name asc
  `;
  const events = await sql<{ title: string; client_user_id: string | null; dj_user_id: string | null; id: string }>`
    select id, title, client_user_id, dj_user_id from events order by event_date asc nulls last
  `;
  const extra =
    role === "dj"
      ? await sql<{ event_id: string; user_id: string }>`select event_id, user_id from event_djs`
      : role === "operator"
        ? await sql<{ event_id: string; user_id: string }>`select event_id, user_id from event_operators`
        : [];
  return rows.map((row) => {
    const titles = new Set<string>();
    if (role === "client") {
      for (const event of events) if (event.client_user_id === row.user_id) titles.add(event.title);
    }
    if (role === "dj") {
      for (const event of events) if (event.dj_user_id === row.user_id) titles.add(event.title);
      for (const link of extra) {
        if (link.user_id !== row.user_id) continue;
        const event = events.find((item) => item.id === link.event_id);
        if (event) titles.add(event.title);
      }
    }
    if (role === "operator") {
      for (const link of extra) {
        if (link.user_id !== row.user_id) continue;
        const event = events.find((item) => item.id === link.event_id);
        if (event) titles.add(event.title);
      }
    }
    return {
      userId: row.user_id,
      displayName: row.display_name,
      email: row.email,
      password: row.issued_password ?? "",
      events: [...titles],
    };
  });
}

export const listClients = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<ClientRow[]> => {
    const profile = await ensureProfile(context.userId);
    assertAdmin(profile);
    return listAccounts("client");
  });

export const createClientAccount = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const raw = (input ?? {}) as Record<string, unknown>;
    const name = typeof raw.name === "string" ? raw.name.trim() : "";
    const email = typeof raw.email === "string" ? raw.email.trim().toLowerCase() : "";
    const password = typeof raw.password === "string" ? raw.password : "";
    const eventId = typeof raw.eventId === "string" ? raw.eventId : "";
    if (name.length < 2) throw new Error("Client name is required");
    if (!email.includes("@") || !email.includes(".")) throw new Error("Enter a real email");
    if (password.length < 8) throw new Error("Password needs at least 8 characters");
    return { name, email, password, eventId };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const profile = await ensureProfile(context.userId);
    assertAdmin(profile);
    await ensureFileColumns();
    const sql = await getSql();
    const existing = await sql<{ id: string }>`
      select id from "user" where lower(email) = ${data.email}
    `;
    if (existing[0]) throw new Error("That email already has an account");
    const { hashPassword } = await import("better-auth/crypto");
    const passwordHash = await hashPassword(data.password);
    const userId = rid();
    const accountId = rid();
    await sql`
      insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
      values (${userId}, ${data.name}, ${data.email}, true, now(), now())
    `;
    try {
      await sql`
        insert into "account" (
          "id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt"
        ) values (
          ${accountId}, ${userId}, 'credential', ${userId}, ${passwordHash}, now(), now()
        )
      `;
      await sql`
        insert into profiles (user_id, role, display_name, issued_password)
        values (${userId}, 'client', ${data.name}, ${data.password})
      `;
    } catch (error) {
      await sql`delete from "user" where id = ${userId}`;
      throw error instanceof Error ? error : new Error("Could not create that login");
    }
    if (data.eventId) {
      await loadEvent(data.eventId, profile);
      await sql`
        update events
        set client_user_id = ${userId}, updated_at = now()
        where id = ${data.eventId}
      `;
      await logChange(data.eventId, profile, `Created client login for ${data.name}`);
    }
    return { userId, email: data.email, name: data.name };
  });

export const listAdmins = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<ClientRow[]> => {
    const profile = await ensureProfile(context.userId);
    assertAdmin(profile);
    return listAccounts("admin");
  });

export const createLogin = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const raw = (input ?? {}) as Record<string, unknown>;
    const name = typeof raw.name === "string" ? raw.name.trim() : "";
    const email = typeof raw.email === "string" ? raw.email.trim().toLowerCase() : "";
    const password = typeof raw.password === "string" ? raw.password : "";
    const role = raw.role === "admin" || raw.role === "dj" || raw.role === "client" || raw.role === "operator" ? raw.role : "";
    if (name.length < 2) throw new Error("Name is required");
    if (!email.includes("@") || !email.includes(".")) throw new Error("Enter a real email");
    if (password.length < 8) throw new Error("Password needs at least 8 characters");
    if (!role) throw new Error("Pick Admin, DJ, Operator, or Client");
    return { name, email, password, role };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const profile = await ensureProfile(context.userId);
    assertAdmin(profile);
    await ensureFileColumns();
    const sql = await getSql();
    const existing = await sql<{ id: string }>`
      select id from "user" where lower(email) = ${data.email}
    `;
    if (existing[0]) throw new Error("That email already has an account");
    const { hashPassword } = await import("better-auth/crypto");
    const passwordHash = await hashPassword(data.password);
    const userId = rid();
    const accountId = rid();
    await sql`
      insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
      values (${userId}, ${data.name}, ${data.email}, true, now(), now())
    `;
    try {
      await sql`
        insert into "account" (
          "id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt"
        ) values (
          ${accountId}, ${userId}, 'credential', ${userId}, ${passwordHash}, now(), now()
        )
      `;
      await sql`
        insert into profiles (user_id, role, display_name, issued_password)
        values (${userId}, ${data.role}, ${data.name}, ${data.password})
      `;
    } catch (error) {
      await sql`delete from "user" where id = ${userId}`;
      throw error instanceof Error ? error : new Error("Could not create that login");
    }
    return { userId, email: data.email, name: data.name, role: data.role };
  });

export const listDjs = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<ClientRow[]> => {
    const profile = await ensureProfile(context.userId);
    assertAdmin(profile);
    return listAccounts("dj");
  });

export const listOperators = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<ClientRow[]> => {
    const profile = await ensureProfile(context.userId);
    assertAdmin(profile);
    return listAccounts("operator");
  });

export const setLoginPassword = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const raw = (input ?? {}) as Record<string, unknown>;
    const userId = typeof raw.userId === "string" ? raw.userId : "";
    const password = typeof raw.password === "string" ? raw.password : "";
    if (!userId) throw new Error("Missing account");
    if (password.length < 8) throw new Error("Password needs at least 8 characters");
    return { userId, password };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const profile = await ensureProfile(context.userId);
    assertAdmin(profile);
    await ensureFileColumns();
    const sql = await getSql();
    const users = await sql<{ id: string }>`select id from "user" where id = ${data.userId}`;
    if (!users[0]) throw new Error("That account was not found");
    const accounts = await sql<{ id: string }>`
      select id from "account" where "userId" = ${data.userId} and "providerId" = 'credential'
    `;
    if (!accounts[0]) throw new Error("That login has no password");
    const { hashPassword } = await import("better-auth/crypto");
    const passwordHash = await hashPassword(data.password);
    await sql`
      update "account"
      set "password" = ${passwordHash}, "updatedAt" = now()
      where "userId" = ${data.userId} and "providerId" = 'credential'
    `;
    await sql`update profiles set issued_password = ${data.password} where user_id = ${data.userId}`;
    return { ok: true };
  });

export const createDjAccount = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const raw = (input ?? {}) as Record<string, unknown>;
    const name = typeof raw.name === "string" ? raw.name.trim() : "";
    const email = typeof raw.email === "string" ? raw.email.trim().toLowerCase() : "";
    const password = typeof raw.password === "string" ? raw.password : "";
    if (name.length < 2) throw new Error("DJ name is required");
    if (!email.includes("@") || !email.includes(".")) throw new Error("Enter a real email");
    if (password.length < 8) throw new Error("Password needs at least 8 characters");
    return { name, email, password };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const profile = await ensureProfile(context.userId);
    assertAdmin(profile);
    await ensureFileColumns();
    const sql = await getSql();
    const existing = await sql<{ id: string }>`
      select id from "user" where lower(email) = ${data.email}
    `;
    if (existing[0]) throw new Error("That email already has an account");
    const { hashPassword } = await import("better-auth/crypto");
    const passwordHash = await hashPassword(data.password);
    const userId = rid();
    const accountId = rid();
    await sql`
      insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
      values (${userId}, ${data.name}, ${data.email}, true, now(), now())
    `;
    try {
      await sql`
        insert into "account" (
          "id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt"
        ) values (
          ${accountId}, ${userId}, 'credential', ${userId}, ${passwordHash}, now(), now()
        )
      `;
      await sql`
        insert into profiles (user_id, role, display_name, issued_password)
        values (${userId}, 'dj', ${data.name}, ${data.password})
      `;
    } catch (error) {
      await sql`delete from "user" where id = ${userId}`;
      throw error instanceof Error ? error : new Error("Could not create that login");
    }
    return { userId, email: data.email, name: data.name };
  });
