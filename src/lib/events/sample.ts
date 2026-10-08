import { rid } from "./defaults";
import type { EventDetails, EventStatus, GenreRank } from "./types";
import { GENRES } from "./types";

export type SampleDraft = {
  title: string;
  eventDate: string;
  venue: string;
  status: EventStatus;
  details: EventDetails;
};

function nextSaturday(from = new Date()): string {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const add = (6 - date.getDay() + 7) % 7 || 7;
  date.setDate(date.getDate() + add);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function song(label: string, songName: string, artist = "", link = "", cue = "") {
  return { id: rid(), label, song: songName, artist, link, cue };
}

function ranks(values: Record<string, string>): GenreRank[] {
  return GENRES.map((label) => ({ id: label, label, rank: values[label] || "" }));
}

export function buildSample(now = new Date()): SampleDraft {
  const details: EventDetails = {
    day: {
      coupleNames: "Elena Voss & Marcus Hale",
      ceremonyLocation: "The Grand Hall, garden terrace, 100 Market Street, Roanoke, VA",
      receptionLocation: "The Grand Hall, ballroom",
      ceremonyStart: "4:30 PM",
      coordinatorName: "Avery Cole",
      coordinatorPhone: "(540) 555-0148",
      liveMusicians: "Yes. A string trio plays the seating and the processional.",
    },
    ceremony: {
      family: [
        { id: rid(), label: "Bride's parents", value: "Helen & Mark Voss" },
        { id: rid(), label: "Bride's grandparents", value: "N/A" },
        { id: rid(), label: "Groom's parents", value: "Ruth & David Hale" },
        { id: rid(), label: "Groom's grandparents", value: "Ida Hale" },
      ],
      music: [
        song("Seating of parents/grandparents", "Canon in D", "Live trio"),
        song("Groom", "Canon in D", "Live trio"),
        song("Officiant", "Air on the G String", "Bach"),
        song("Groomsmen", "A Thousand Years", "Live trio"),
        song("Bridesmaids/flower girl(s)", "A Thousand Years", "Live trio"),
        song("Entrance of bride", "Arrival of the Queen of Sheba", "Handel"),
        song("Unity ceremony", "La Vie en Rose", "Violin"),
        song("Exit song", "Signed, Sealed, Delivered", "Stevie Wonder", "", "the chorus"),
      ],
    },
    reception: [
      song("Wedding party intro", "September", "Earth, Wind & Fire"),
      song("Bride and groom intro", "Can't Help Falling in Love", "Haley Reinhart"),
      song("First dance", "At Last", "Etta James"),
      song("Father/daughter dance", "The Way You Look Tonight", "Frank Sinatra"),
      song("Mother/son dance", "What a Wonderful World", "Louis Armstrong"),
      song("Cake cutting", "Sugar", "Maroon 5"),
      song("Bouquet toss", "Single Ladies", "Beyoncé"),
      song("Garter toss", "", ""),
      song("Last song with guest", "La Vie en Rose", "Louis Armstrong"),
      song("Moonlight dance", "Unchained Melody", "The Righteous Brothers"),
    ],
    toasts: [
      { id: rid(), label: "Maid of honor", value: "Siobhan Voss" },
      { id: rid(), label: "Best man", value: "Andre Hale" },
    ],
    introductions: {
      style: "couples",
      groupAnnounce: "",
      groupTitle: "the bridesmaids and groomsmen",
      pairs: [
        { id: rid(), leftRole: "Bridesmaid", leftName: "Lila Cho", rightRole: "Groomsman", rightName: "Chris Nguyen" },
        { id: rid(), leftRole: "Maid of honor", leftName: "Siobhan Voss", rightRole: "Best man", rightName: "Andre Hale" },
      ],
      names: [],
      bridesmaidCount: "1",
      groomsmanCount: "1",
      parents: "yes",
      brideParents: "Helen & Mark Voss",
      groomParents: "Ruth & David Hale",
      others: [
        { id: rid(), role: "Flower girl", name: "Willa Hale", skip: true },
        { id: rid(), role: "Ring bearer", name: "", skip: true },
      ],
      coupleAnnounce: "Mr. and Mrs. Hale",
    },
    taste: {
      doNotPlay: "Cotton Eye Joe\nThe Chicken Dance\nNo heavy line dances",
      brideArtists: "Etta James, Beyoncé, Stevie Wonder",
      groomArtists: "Chris Stapleton, Luke Combs",
      brideGrad: "2014",
      groomGrad: "2013",
      genres: ranks({
        "60s": "8",
        "70s": "6",
        "80s": "5",
        "90s": "4",
        "2000s": "2",
        "2010s": "3",
        Disco: "9",
        "Top 40/current": "7",
        "Hip hop": "10",
        Country: "1",
      }),
      playlists: [{ id: rid(), name: "Hale wedding", link: "https://open.spotify.com/playlist/example" }],
    },
    rest: {
      longestMarried: "Not sure yet. Ask Helen the week of.",
      exitPlan: "Sparklers at the side door",
      alcohol: "Yes. Last call 10:15.",
      blessing: "Helen Voss",
      vendors: [
        { id: rid(), role: "Wedding planner", name: "Avery Cole" },
        { id: rid(), role: "Catering", name: "Grand Hall kitchen" },
        { id: rid(), role: "Photography", name: "Northlight Photo" },
        { id: rid(), role: "Videography", name: "Ridge & Reel" },
        { id: rid(), role: "Cake", name: "Market Street Bakery" },
        { id: rid(), role: "Hair and makeup", name: "" },
        { id: rid(), role: "Flowers", name: "Ridge Bloom" },
      ],
      requests: "Keep it classy until dinner is cleared. If a toast runs long, shorten the moonlight dance, not the first dance.",
      timelinePdfName: "",
      timeline: [
        { id: rid(), label: "Ceremony", time: "4:30 PM", notes: "Garden terrace. About 25 minutes." },
        { id: rid(), label: "Cocktail hour", time: "5:15 PM", notes: "Foyer." },
        { id: rid(), label: "Introductions", time: "6:25 PM", notes: "Party, then the couple." },
        { id: rid(), label: "Dinner", time: "6:55 PM", notes: "Blessing first." },
        { id: rid(), label: "Open dancing", time: "8:15 PM", notes: "" },
        { id: rid(), label: "Send-off", time: "10:40 PM", notes: "Sparklers." },
      ],
    },
  };

  return {
    title: "Voss & Hale",
    eventDate: nextSaturday(now),
    venue: "The Grand Hall",
    status: "ready",
    details,
  };
}
