export const STATUSES = [
  "new",
  "planning",
  "needs_info",
  "ready",
  "locked",
  "completed",
  "archived",
] as const;

export type EventStatus = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<EventStatus, string> = {
  new: "New",
  planning: "Planning",
  needs_info: "Needs Information",
  ready: "Ready",
  locked: "Locked",
  completed: "Completed",
  archived: "Archived",
};

export const SECTIONS = [
  { id: "day", label: "The day" },
  { id: "ceremony", label: "Ceremony" },
  { id: "introductions", label: "Introductions" },
  { id: "reception", label: "Reception songs" },
  { id: "toasts", label: "Toasts" },
  { id: "taste", label: "Music taste" },
  { id: "rest", label: "The rest" },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];
export type SectionState = "empty" | "progress" | "complete";

export const GENRES = [
  "60s",
  "70s",
  "80s",
  "90s",
  "2000s",
  "2010s",
  "Disco",
  "Top 40/current",
  "Hip hop",
  "Country",
] as const;

export type PlaylistLine = {
  id: string;
  name: string;
  link: string;
};

export type NameLine = {
  id: string;
  label: string;
  value: string;
};

export type SongCue = {
  id: string;
  label: string;
  song: string;
  artist: string;
  link: string;
  cue: string;
};

export type IntroPerson = {
  id: string;
  role: string;
  name: string;
  skip: boolean;
};

export type IntroPair = {
  id: string;
  leftRole: string;
  leftName: string;
  rightRole: string;
  rightName: string;
};

export type VendorLine = {
  id: string;
  role: string;
  name: string;
};

export type GenreRank = {
  id: string;
  label: string;
  rank: string;
};

export type TimelineItem = {
  id: string;
  label: string;
  time: string;
  notes: string;
};

export type EventDetails = {
  day: {
    coupleNames: string;
    ceremonyLocation: string;
    receptionLocation: string;
    ceremonyStart: string;
    coordinatorName: string;
    coordinatorPhone: string;
    liveMusicians: string;
  };
  ceremony: {
    family: NameLine[];
    music: SongCue[];
  };
  reception: SongCue[];
  toasts: NameLine[];
  introductions: {
    style: "" | "couples" | "group";
    groupAnnounce: "" | "names" | "title";
    groupTitle: string;
    pairs: IntroPair[];
    names: IntroPerson[];
    bridesmaidCount: string;
    groomsmanCount: string;
    parents: "" | "yes" | "no";
    brideParents: string;
    groomParents: string;
    others: IntroPerson[];
    coupleAnnounce: string;
  };
  taste: {
    doNotPlay: string;
    brideArtists: string;
    groomArtists: string;
    brideGrad: string;
    groomGrad: string;
    genres: GenreRank[];
    playlists: PlaylistLine[];
  };
  rest: {
    longestMarried: string;
    exitPlan: string;
    alcohol: string;
    blessing: string;
    vendors: VendorLine[];
    requests: string;
    timelinePdfName: string;
    timeline: TimelineItem[];
  };
};

export type Profile = {
  userId: string;
  role: "admin" | "client";
  displayName: string;
  email: string;
};

export type EventSummary = {
  id: string;
  title: string;
  eventDate: string | null;
  venue: string;
  status: EventStatus;
  updatedAt: string;
  clientUserId: string | null;
  clientName: string | null;
  couple: string;
  percent: number;
  missing: string[];
};

export type ChangeRow = {
  id: string;
  summary: string;
  actorName: string;
  createdAt: string;
};

export type EventRecord = {
  id: string;
  title: string;
  eventDate: string | null;
  venue: string;
  status: EventStatus;
  lockedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  clientUserId: string | null;
  clientName: string | null;
  boothNotes: string;
  contractPdfName: string;
  details: EventDetails;
  changes: ChangeRow[];
};

export type ClientRow = {
  userId: string;
  displayName: string;
  email: string;
};
