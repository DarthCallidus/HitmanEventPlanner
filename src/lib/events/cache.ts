import { normalizeDetails } from "./defaults";
import type { EventRecord } from "./types";

const PREFIX = "ghe:v1:";

export type CachedEvent = { savedAt: string; event: EventRecord };

export function writeCache(event: EventRecord) {
  const payload: CachedEvent = { savedAt: new Date().toISOString(), event };
  localStorage.setItem(PREFIX + event.id, JSON.stringify(payload));
  localStorage.setItem(PREFIX + "last", event.id);
}

export function readCache(id: string): CachedEvent | null {
  try {
    const raw = localStorage.getItem(PREFIX + id);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedEvent;
    if (!parsed?.event?.id) return null;
    parsed.event.details = normalizeDetails(parsed.event.details);
    parsed.event.boothNotes = parsed.event.boothNotes ?? "";
    parsed.event.contractPdfName = parsed.event.contractPdfName ?? "";
    parsed.event.djUserId = parsed.event.djUserId ?? null;
    parsed.event.djName = parsed.event.djName ?? null;
    parsed.event.changes = parsed.event.changes ?? [];
    return parsed;
  } catch {
    return null;
  }
}

export function readChecks(id: string): string[] {
  try {
    const raw = localStorage.getItem(PREFIX + "checks:" + id);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function writeChecks(id: string, ids: string[]) {
  localStorage.setItem(PREFIX + "checks:" + id, JSON.stringify(ids));
}

export type BoothRequest = {
  id: string;
  song: string;
  artist: string;
  who: string;
  mark: "" | "played" | "skipped";
};

export function readRequests(id: string): BoothRequest[] {
  try {
    const raw = localStorage.getItem(PREFIX + "requests:" + id);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((row) => {
      if (!row || typeof row !== "object") return [];
      const item = row as Partial<BoothRequest>;
      if (typeof item.id !== "string" || typeof item.song !== "string") return [];
      const mark = item.mark === "played" || item.mark === "skipped" ? item.mark : "";
      return [{ id: item.id, song: item.song, artist: typeof item.artist === "string" ? item.artist : "", who: typeof item.who === "string" ? item.who : "", mark }];
    });
  } catch {
    return [];
  }
}

export function writeRequests(id: string, rows: BoothRequest[]) {
  localStorage.setItem(PREFIX + "requests:" + id, JSON.stringify(rows));
}

export function readPendingNotes(id: string): string | null {
  return localStorage.getItem(PREFIX + "notes:" + id);
}

export function writePendingNotes(id: string, notes: string) {
  localStorage.setItem(PREFIX + "notes:" + id, notes);
}

export function clearPendingNotes(id: string) {
  localStorage.removeItem(PREFIX + "notes:" + id);
}

export function writePdfCache(id: string, name: string, base64: string) {
  localStorage.setItem(PREFIX + "pdf:" + id, JSON.stringify({ name, base64 }));
}

export function clearPdfCache(id: string) {
  localStorage.removeItem(PREFIX + "pdf:" + id);
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read that PDF"));
    reader.readAsDataURL(file);
  });
}

export function openPdf(base64: string, name: string) {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.download = name || "timeline.pdf";
  link.click();
}

export function readPdfCache(id: string): { name: string; base64: string } | null {
  try {
    const raw = localStorage.getItem(PREFIX + "pdf:" + id);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { name?: string; base64?: string };
    if (!parsed?.base64) return null;
    return { name: parsed.name || "timeline.pdf", base64: parsed.base64 };
  } catch {
    return null;
  }
}

export function clearEventCache(id: string) {
  localStorage.removeItem(PREFIX + id);
  localStorage.removeItem(PREFIX + "checks:" + id);
  localStorage.removeItem(PREFIX + "notes:" + id);
  localStorage.removeItem(PREFIX + "pdf:" + id);
  if (localStorage.getItem(PREFIX + "last") === id) {
    localStorage.removeItem(PREFIX + "last");
  }
}
