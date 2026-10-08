import type { EventDetails, EventStatus, GenreRank, IntroPair, IntroPerson, NameLine, PlaylistLine, SongCue, VendorLine } from "./types";
import { GENRES, STATUSES as STATUS_LIST } from "./types";

export function rid(): string {
  return crypto.randomUUID();
}

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function songCue(item: unknown, label = ""): SongCue {
  const row = obj(item);
  return {
    id: str(row.id) || rid(),
    label: str(row.label) || str(row.kind) || label,
    song: str(row.song) || str(row.value) || str(row.title),
    artist: str(row.artist),
    link: str(row.link),
    cue: str(row.cue) || str(row.notes),
  };
}

function songList(raw: unknown, labels: string[]): SongCue[] {
  if (Array.isArray(raw)) return raw.map((item) => songCue(item));
  return labels.map((label) => songCue({}, label));
}

function nameLines(raw: unknown, labels: string[]): NameLine[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => {
      const row = obj(item);
      return { id: str(row.id) || rid(), label: str(row.label), value: str(row.value) || str(row.name) };
    });
  }
  return labels.map((label) => ({ id: rid(), label, value: "" }));
}

function playlistsOf(raw: unknown): PlaylistLine[] {
  if (!Array.isArray(raw)) return [{ id: rid(), name: "", link: "" }];
  return raw.map((item) => {
    const row = obj(item);
    return { id: str(row.id) || rid(), name: str(row.name), link: str(row.link) || str(row.url) };
  });
}

function genresOf(raw: unknown): GenreRank[] {
  const saved = Array.isArray(raw) ? raw.map((item) => obj(item)) : [];
  return GENRES.map((label) => {
    const found = saved.find((row) => str(row.label) === label || str(row.id) === label);
    return { id: label, label, rank: found ? str(found.rank) : "" };
  });
}

const FAMILY = ["Bride's parents", "Bride's grandparents", "Groom's parents", "Groom's grandparents"];

const CEREMONY_SONGS = [
  "Seating of parents/grandparents",
  "Groom",
  "Officiant",
  "Groomsmen",
  "Bridesmaids/flower girl(s)",
  "Entrance of bride",
  "Unity ceremony",
  "Exit song",
];

const RECEPTION_SONGS = [
  "Wedding party intro",
  "Bride and groom intro",
  "First dance",
  "Father/daughter dance",
  "Mother/son dance",
  "Cake cutting",
  "Bouquet toss",
  "Garter toss",
  "Last song with guest",
  "Moonlight dance",
];

const TOASTS = ["Maid of honor", "Best man"];

const OTHER_ROLES = ["Flower girl", "Ring bearer"];

const VENDOR_ROLES = [
  "Wedding planner",
  "Catering",
  "Photography",
  "Videography",
  "Cake",
  "Hair and makeup",
  "Flowers",
];

function defaultCeremonyOrder(rows: SongCue[]): SongCue[] {
  const cleaned = rows.filter((row) => !/prayer/i.test(row.label));
  if (cleaned.length !== CEREMONY_SONGS.length) return cleaned;
  const labels = new Set(cleaned.map((row) => row.label));
  if (labels.size !== CEREMONY_SONGS.length || !CEREMONY_SONGS.every((label) => labels.has(label))) return cleaned;
  return CEREMONY_SONGS.map((label) => cleaned.find((row) => row.label === label)!);
}

function receptionLabel(label: string): string {
  const name = label.trim().toLowerCase();
  if (name === "last song") return "Last song with guest";
  if (name === "cake") return "Cake cutting";
  return label;
}

function honorName(intro: EventDetails["introductions"] | undefined, role: RegExp): string {
  for (const pair of intro?.pairs ?? []) {
    if (role.test(pair.leftRole || "") && (pair.leftName || "").trim()) return pair.leftName.trim();
    if (role.test(pair.rightRole || "") && (pair.rightName || "").trim()) return pair.rightName.trim();
  }
  const person = (intro?.names ?? []).find((row) => role.test(row.role || "") && (row.name || "").trim());
  return person?.name.trim() || "";
}

function linkToasts(rows: NameLine[], intro: EventDetails["introductions"] | undefined): NameLine[] {
  const maid = honorName(intro, /maid of honor/i);
  const best = honorName(intro, /best man/i);
  return rows.map((row) => {
    const name = /maid of honor/i.test(row.label) ? maid : /best man/i.test(row.label) ? best : "";
    if (!name || name === row.value) return row;
    return { ...row, value: name };
  });
}

function splitCoordinator(value: string): { name: string; phone: string } {
  const phone = value.match(/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/)?.[0]?.trim() || "";
  const name = value.replace(phone, "").replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
  return { name, phone };
}

export function alignSavedDetails(details: EventDetails): EventDetails {
  const music = defaultCeremonyOrder(details.ceremony.music);
  const reception = details.reception.map((row) => {
    const label = receptionLabel(row.label);
    return label === row.label ? row : { ...row, label };
  });
  const musicSame = music.length === details.ceremony.music.length && music.every((row, index) => row === details.ceremony.music[index]);
  const receptionSame = reception.every((row, index) => row === details.reception[index]);
  const hasToasts = Array.isArray((details as EventDetails & { toasts?: NameLine[] }).toasts);
  const baseToasts = hasToasts ? details.toasts : TOASTS.map((label) => ({ id: rid(), label, value: "" }));
  const toasts = linkToasts(baseToasts, details.introductions);
  const toastsSame = hasToasts && toasts.every((row, index) => row === baseToasts[index]);
  const legacyDay = details.day as EventDetails["day"] & { coordinator?: string };
  const fromOld =
    legacyDay.coordinatorName || legacyDay.coordinatorPhone
      ? { name: legacyDay.coordinatorName || "", phone: legacyDay.coordinatorPhone || "" }
      : splitCoordinator(legacyDay.coordinator || "");
  const dayChanged = Boolean(legacyDay.coordinator) || fromOld.name !== (legacyDay.coordinatorName || "") || fromOld.phone !== (legacyDay.coordinatorPhone || "");
  const hasPlaylists = Array.isArray(details.taste?.playlists);
  if (musicSame && receptionSame && !dayChanged && toastsSame && hasPlaylists) return details;
  return {
    ...details,
    day: dayChanged
      ? {
          coupleNames: legacyDay.coupleNames,
          ceremonyLocation: legacyDay.ceremonyLocation,
          receptionLocation: legacyDay.receptionLocation,
          ceremonyStart: legacyDay.ceremonyStart,
          coordinatorName: fromOld.name,
          coordinatorPhone: fromOld.phone,
          liveMusicians: legacyDay.liveMusicians,
        }
      : details.day,
    ceremony: musicSame ? details.ceremony : { ...details.ceremony, music },
    reception,
    toasts,
    taste: hasPlaylists ? details.taste : { ...details.taste, playlists: [{ id: rid(), name: "", link: "" }] },
  };
}

function ceremonyMusic(ceremony: Record<string, unknown>): unknown {
  if (Array.isArray(ceremony.music)) return ceremony.music;
  const seeded = [
    { label: "Seating of parents/grandparents", song: str(ceremony.seatingSong) },
    { label: "Groom", song: str(ceremony.groomEntrance) || str(ceremony.processional) },
    { label: "Officiant", song: str(ceremony.officiant) },
    { label: "Groomsmen", song: str(ceremony.partyEntrance) || str(ceremony.partyProcessional) },
    { label: "Bridesmaids/flower girl(s)", song: "" },
    { label: "Entrance of bride", song: str(ceremony.brideEntrance) || str(ceremony.coupleEntrance) },
    { label: "Unity ceremony", song: str(ceremony.specialMusic) },
    { label: "Exit song", song: str(ceremony.exitSong) || str(ceremony.recessional), cue: str(ceremony.exitCue) },
  ];
  return seeded.some((row) => row.song) ? seeded : null;
}

function legacyReception(raw: Record<string, unknown>): SongCue[] | null {
  const entrance = obj(raw.entrance);
  const dances = Array.isArray(raw.dances) ? raw.dances : [];
  const formalities = Array.isArray(raw.formalities) ? raw.formalities : [];
  if (!dances.length && !formalities.length && !str(entrance.coupleSong)) return null;
  const rows: SongCue[] = [];
  if (str(entrance.coupleSong)) {
    rows.push(songCue({ label: "Bride and groom intro", song: entrance.coupleSong, artist: entrance.coupleSongArtist }));
  }
  for (const item of dances) rows.push(songCue(item));
  for (const item of formalities) {
    const row = obj(item);
    if (!row.enabled && !str(row.song)) continue;
    rows.push(songCue({ label: row.label, song: row.song, notes: row.notes }));
  }
  return rows.length ? rows : null;
}

function person(item: unknown): IntroPerson {
  const row = obj(item);
  return { id: str(row.id) || rid(), role: str(row.role), name: str(row.name), skip: Boolean(row.skip) };
}

function pair(item: unknown): IntroPair {
  const row = obj(item);
  return {
    id: str(row.id) || rid(),
    leftRole: str(row.leftRole) || "Bridesmaid",
    leftName: str(row.leftName),
    rightRole: str(row.rightRole) || "Groomsman",
    rightName: str(row.rightName),
  };
}

function isPartyRole(role: string): boolean {
  return /bridesmaid|groomsman|maid of honor|best man/i.test(role);
}

function honorLast(rows: IntroPair[]): IntroPair[] {
  const index = rows.findIndex((row) => /maid of honor|best man/i.test(`${row.leftRole} ${row.rightRole}`));
  if (index < 0 || index === rows.length - 1) return rows;
  const honor = rows[index];
  return [...rows.filter((_, item) => item !== index), honor];
}

function namesHonorLast(rows: IntroPerson[]): IntroPerson[] {
  const maid = rows.filter((row) => /maid of honor/i.test(row.role));
  const best = rows.filter((row) => /best man/i.test(row.role));
  if (!maid.length && !best.length) return rows;
  const rest = rows.filter((row) => !/maid of honor|best man/i.test(row.role));
  return [...rest, ...maid, ...best];
}

function counted(raw: unknown, key: "leftRole" | "rightRole", role: RegExp): string {
  if (!Array.isArray(raw)) return "";
  const count = raw.filter((item) => role.test(str(obj(item)[key]))).length;
  return count ? String(count) : "";
}

function legacyIntros(raw: Record<string, unknown>): IntroPerson[] | null {
  const entrance = obj(raw.entrance);
  const entries = Array.isArray(entrance.entries) ? entrance.entries : [];
  if (entries.length) {
    return entries.map((item) => {
      const row = obj(item);
      return { id: rid(), role: str(row.pairing), name: str(row.names), skip: false };
    });
  }
  if (Array.isArray(raw.party) && raw.party.length) {
    return raw.party.map((item) => {
      const row = obj(item);
      return { id: str(row.id) || rid(), role: str(row.role), name: str(row.name), skip: false };
    });
  }
  return null;
}

function legacyVendors(basics: Record<string, unknown>): VendorLine[] {
  const filled: Record<string, string> = {
    "Wedding planner": [str(basics.plannerName), str(basics.plannerPhone)].filter(Boolean).join(" "),
    Photography: str(basics.photographer),
    Videography: str(basics.videographer),
  };
  return VENDOR_ROLES.map((role) => ({ id: rid(), role, name: filled[role] || "" }));
}

function legacyDoNotPlay(music: Record<string, unknown>): string {
  const rows = Array.isArray(music.doNotPlay) ? music.doNotPlay : [];
  return rows
    .map((item) => {
      const row = obj(item);
      return [str(row.title), str(row.artist)].filter(Boolean).join(" — ");
    })
    .filter(Boolean)
    .join("\n");
}

export function emptyDetails(): EventDetails {
  return normalizeDetails({});
}

export function normalizeDetails(input: unknown): EventDetails {
  const raw = obj(input);
  const basics = obj(raw.basics);
  const ceremony = obj(raw.ceremony);
  const dinner = obj(raw.dinner);
  const music = obj(raw.music);
  const dayIn = obj(raw.day);
  const tasteIn = obj(raw.taste);
  const restIn = obj(raw.rest);
  const introIn = obj(raw.introductions);
  const fresh = !raw.day;

  const familySource = Array.isArray(ceremony.family)
    ? ceremony.family
    : FAMILY.map((label) => ({ label, value: "" }));

  const normalized: EventDetails = {
    day: {
      coupleNames: str(dayIn.coupleNames) || str(basics.coupleNames),
      ceremonyLocation: str(dayIn.ceremonyLocation) || str(ceremony.location) || str(basics.ceremonyLocation),
      receptionLocation: str(dayIn.receptionLocation) || str(basics.receptionLocation),
      ceremonyStart: str(dayIn.ceremonyStart) || str(ceremony.startTime),
      coordinatorName: str(dayIn.coordinatorName) || splitCoordinator(str(dayIn.coordinator) || str(ceremony.coordinator) || str(basics.plannerName)).name,
      coordinatorPhone:
        str(dayIn.coordinatorPhone) ||
        splitCoordinator([str(dayIn.coordinator), str(ceremony.coordinator), str(basics.plannerPhone)].filter(Boolean).join(" ")).phone,
      liveMusicians: str(dayIn.liveMusicians) || str(ceremony.liveMusicians),
    },
    ceremony: {
      family: nameLines(familySource, FAMILY),
      music: defaultCeremonyOrder(songList(ceremonyMusic(ceremony), CEREMONY_SONGS)),
    },
    reception: songList(
      Array.isArray(raw.reception) ? raw.reception : fresh ? legacyReception(raw) : null,
      RECEPTION_SONGS,
    ).map((row) => {
      const label = receptionLabel(row.label);
      return label === row.label ? row : { ...row, label };
    }),
    toasts: nameLines(raw.toasts, TOASTS),
    introductions: (() => {
      const style = introIn.style === "couples" || introIn.style === "group" ? introIn.style : "";
      const groupAnnounce = introIn.groupAnnounce === "names" || introIn.groupAnnounce === "title" ? introIn.groupAnnounce : "";
      const legacy = Array.isArray(introIn.party)
        ? introIn.party.map(person)
        : legacyIntros(raw) || [];
      const names = Array.isArray(introIn.names) ? introIn.names.map(person) : legacy.filter((row) => isPartyRole(row.role));
      const leftover = legacy.filter((row) => !isPartyRole(row.role));
      const rawOthers = Array.isArray(introIn.others) ? introIn.others.map(person) : leftover;
      const brideRow = rawOthers.find((row) => /parent/i.test(row.role) && /bride/i.test(row.role));
      const groomRow = rawOthers.find((row) => /parent/i.test(row.role) && /groom/i.test(row.role));
      const parents =
        introIn.parents === "yes" || introIn.parents === "no"
          ? introIn.parents
          : brideRow?.skip && (groomRow?.skip || !groomRow)
            ? "no"
            : (brideRow && !brideRow.skip && brideRow.name) || (groomRow && !groomRow.skip && groomRow.name)
              ? "yes"
              : "";
      const others = rawOthers.filter((row) => !/parent/i.test(row.role));
      return {
        style,
        groupAnnounce,
        groupTitle: str(introIn.groupTitle) || "the bridesmaids and groomsmen",
        pairs: honorLast(Array.isArray(introIn.pairs) ? introIn.pairs.map(pair) : []),
        names: namesHonorLast(names),
        bridesmaidCount: str(introIn.bridesmaidCount) || counted(introIn.pairs, "leftRole", /bridesmaid/i),
        groomsmanCount: str(introIn.groomsmanCount) || counted(introIn.pairs, "rightRole", /groomsman/i),
        parents,
        brideParents: str(introIn.brideParents) || (brideRow && !brideRow.skip ? brideRow.name : ""),
        groomParents: str(introIn.groomParents) || (groomRow && !groomRow.skip ? groomRow.name : ""),
        others: others.length || Array.isArray(introIn.others) || leftover.length
          ? others
          : OTHER_ROLES.map((role) => ({ id: rid(), role, name: "", skip: false })),
        coupleAnnounce: str(introIn.coupleAnnounce),
      };
    })(),
    taste: {
      doNotPlay: str(tasteIn.doNotPlay) || (fresh ? legacyDoNotPlay(music) : ""),
      brideArtists: str(tasteIn.brideArtists) || str(tasteIn.artists) || (fresh ? str(music.artists) : ""),
      groomArtists: str(tasteIn.groomArtists),
      brideGrad: str(tasteIn.brideGrad),
      groomGrad: str(tasteIn.groomGrad),
      genres: genresOf(tasteIn.genres),
      playlists: playlistsOf(tasteIn.playlists),
    },
    rest: {
      longestMarried: str(restIn.longestMarried),
      exitPlan: str(restIn.exitPlan),
      alcohol: str(restIn.alcohol),
      blessing: str(restIn.blessing) || (fresh ? str(dinner.whoBlessing) || str(dinner.blessing) : ""),
      vendors: Array.isArray(restIn.vendors)
        ? restIn.vendors.map((item) => {
            const row = obj(item);
            return { id: str(row.id) || rid(), role: str(row.role), name: str(row.name) };
          })
        : legacyVendors(basics),
      requests:
        str(restIn.requests) ||
        (fresh ? [str(raw.notes), str(music.vibe), str(music.genres)].filter(Boolean).join("\n\n") : ""),
      timelinePdfName: str(restIn.timelinePdfName),
      timeline: (Array.isArray(restIn.timeline) ? restIn.timeline : Array.isArray(raw.timeline) ? raw.timeline : []).map(
        (item) => {
          const row = obj(item);
          return { id: str(row.id) || rid(), label: str(row.label), time: str(row.time), notes: str(row.notes) };
        },
      ),
    },
  };
  return { ...normalized, toasts: linkToasts(normalized.toasts, normalized.introductions) };
}

export function asStatus(v: unknown): EventStatus {
  return (STATUS_LIST as readonly string[]).includes(String(v)) ? (v as EventStatus) : "new";
}
