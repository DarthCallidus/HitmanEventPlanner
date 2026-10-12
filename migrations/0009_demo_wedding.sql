insert into events (
  id, created_by, title, event_date, venue, status, booth_notes, details
)
select
  'demo-voss-hale',
  'seed',
  'Voss & Hale',
  '2026-10-17',
  'The Grand Hall',
  'ready',
  'Test wedding for review. Not a real couple. Safe to delete.',
  $json${
    "kind": "wedding",
    "day": {
      "coupleNames": "Elena Voss & Marcus Hale",
      "ceremonyLocation": "The Grand Hall, garden terrace, 100 Market Street, Roanoke, VA",
      "receptionLocation": "The Grand Hall, ballroom",
      "ceremonyStart": "4:30 PM",
      "endTime": "",
      "coordinatorName": "Avery Cole",
      "coordinatorPhone": "(540) 555-0148",
      "liveMusicians": "Yes. A string trio plays the seating and the processional."
    },
    "ceremony": {
      "family": [
        {"id": "fam-bride-parents", "label": "Bride's parents", "value": "Helen & Mark Voss"},
        {"id": "fam-bride-grandparents", "label": "Bride's grandparents", "value": "N/A"},
        {"id": "fam-groom-parents", "label": "Groom's parents", "value": "Ruth & David Hale"},
        {"id": "fam-groom-grandparents", "label": "Groom's grandparents", "value": "Ida Hale"}
      ],
      "music": [
        {"id": "cer-seating", "label": "Seating of parents/grandparents", "song": "Canon in D", "artist": "Pachelbel", "link": "https://open.spotify.com/search/canon%20in%20d", "cue": ""},
        {"id": "cer-groom", "label": "Groom", "song": "Canon in D", "artist": "Pachelbel", "link": "https://open.spotify.com/search/canon%20in%20d", "cue": ""},
        {"id": "cer-officiant", "label": "Officiant", "song": "Air on the G String", "artist": "Bach", "link": "https://open.spotify.com/search/air%20on%20the%20g%20string", "cue": ""},
        {"id": "cer-groomsmen", "label": "Groomsmen", "song": "A Thousand Years", "artist": "Christina Perri", "link": "https://open.spotify.com/search/a%20thousand%20years", "cue": ""},
        {"id": "cer-bridesmaids", "label": "Bridesmaids/flower girl(s)", "song": "A Thousand Years", "artist": "Christina Perri", "link": "https://open.spotify.com/search/a%20thousand%20years", "cue": ""},
        {"id": "cer-bride", "label": "Entrance of bride", "song": "Arrival of the Queen of Sheba", "artist": "Handel", "link": "https://open.spotify.com/search/queen%20of%20sheba", "cue": ""},
        {"id": "cer-unity", "label": "Unity ceremony", "song": "La Vie en Rose", "artist": "Louis Armstrong", "link": "https://open.spotify.com/search/la%20vie%20en%20rose", "cue": ""},
        {"id": "cer-exit", "label": "Exit song", "song": "Signed, Sealed, Delivered", "artist": "Stevie Wonder", "link": "https://open.spotify.com/search/signed%20sealed%20delivered", "cue": "the chorus"}
      ]
    },
    "reception": [
      {"id": "rec-party", "label": "Wedding party intro", "song": "September", "artist": "Earth, Wind & Fire", "link": "https://open.spotify.com/search/september", "cue": ""},
      {"id": "rec-couple", "label": "Bride and groom intro", "song": "Can't Help Falling in Love", "artist": "Haley Reinhart", "link": "https://open.spotify.com/search/cant%20help%20falling%20in%20love", "cue": ""},
      {"id": "rec-first", "label": "First dance", "song": "At Last", "artist": "Etta James", "link": "https://open.spotify.com/search/at%20last%20etta", "cue": ""},
      {"id": "rec-father", "label": "Father/daughter dance", "song": "The Way You Look Tonight", "artist": "Frank Sinatra", "link": "https://open.spotify.com/search/the%20way%20you%20look%20tonight", "cue": ""},
      {"id": "rec-mother", "label": "Mother/son dance", "song": "What a Wonderful World", "artist": "Louis Armstrong", "link": "https://open.spotify.com/search/what%20a%20wonderful%20world", "cue": ""},
      {"id": "rec-cake", "label": "Cake cutting", "song": "Sugar", "artist": "Maroon 5", "link": "https://open.spotify.com/search/sugar%20maroon%205", "cue": ""},
      {"id": "rec-bouquet", "label": "Bouquet toss", "song": "Single Ladies", "artist": "Beyoncé", "link": "https://open.spotify.com/search/single%20ladies", "cue": ""},
      {"id": "rec-garter", "label": "Garter toss", "song": "Let's Get It On", "artist": "Marvin Gaye", "link": "https://open.spotify.com/search/lets%20get%20it%20on", "cue": ""},
      {"id": "rec-last", "label": "Last song with guest", "song": "La Vie en Rose", "artist": "Louis Armstrong", "link": "https://open.spotify.com/search/la%20vie%20en%20rose", "cue": ""},
      {"id": "rec-moon", "label": "Moonlight dance", "song": "Unchained Melody", "artist": "The Righteous Brothers", "link": "https://open.spotify.com/search/unchained%20melody", "cue": ""}
    ],
    "toasts": [
      {"id": "toast-moh", "label": "Maid of honor", "value": "Siobhan Voss"},
      {"id": "toast-best", "label": "Best man", "value": "Andre Hale"},
      {"id": "toast-father", "label": "Father of the bride", "value": "Mark Voss"}
    ],
    "introductions": {
      "style": "couples",
      "groupAnnounce": "",
      "groupTitle": "the bridesmaids and groomsmen",
      "pairs": [
        {"id": "pair-1", "leftRole": "Bridesmaid", "leftName": "Lila Cho", "rightRole": "Groomsman", "rightName": "Chris Nguyen"},
        {"id": "pair-2", "leftRole": "Bridesmaid", "leftName": "Nora Hale", "rightRole": "Groomsman", "rightName": "Ben Cole"},
        {"id": "pair-3", "leftRole": "Bridesmaid", "leftName": "Priya Shah", "rightRole": "Groomsman", "rightName": "Evan Brooks"},
        {"id": "pair-honor", "leftRole": "Maid of honor", "leftName": "Siobhan Voss", "rightRole": "Best man", "rightName": "Andre Hale"}
      ],
      "names": [],
      "bridesmaidCount": "3",
      "groomsmanCount": "3",
      "parents": "yes",
      "brideParents": "Helen & Mark Voss",
      "groomParents": "Ruth & David Hale",
      "others": [
        {"id": "other-flower", "role": "Flower girl", "name": "Willa Hale", "skip": false},
        {"id": "other-ring", "role": "Ring bearer", "name": "Jonah Hale", "skip": false}
      ],
      "coupleAnnounce": "Mr. and Mrs. Hale"
    },
    "taste": {
      "doNotPlay": "Cotton Eye Joe\nThe Chicken Dance\nNo heavy line dances",
      "brideArtists": "Etta James, Beyoncé, Stevie Wonder",
      "groomArtists": "Chris Stapleton, Luke Combs",
      "brideGrad": "2014",
      "groomGrad": "2013",
      "genres": [
        {"id": "60s", "label": "60s", "rank": "8"},
        {"id": "70s", "label": "70s", "rank": "6"},
        {"id": "80s", "label": "80s", "rank": "5"},
        {"id": "90s", "label": "90s", "rank": "4"},
        {"id": "2000s", "label": "2000s", "rank": "2"},
        {"id": "2010s", "label": "2010s", "rank": "3"},
        {"id": "Disco", "label": "Disco", "rank": "9"},
        {"id": "Top 40/current", "label": "Top 40/current", "rank": "7"},
        {"id": "Hip hop", "label": "Hip hop", "rank": "10"},
        {"id": "Country", "label": "Country", "rank": "1"}
      ],
      "playlists": [
        {"id": "list-cocktail", "name": "Cocktail / dinner", "link": "https://open.spotify.com/playlist/37i9dQZF1DX4WYpdgoIcn6"},
        {"id": "list-dance", "name": "Dance", "link": "https://open.spotify.com/playlist/37i9dQZF1DXaXB8fQg7xif"}
      ]
    },
    "rest": {
      "longestMarried": "Ruth & David Hale, 41 years",
      "exitPlan": "Sparkler",
      "alcohol": "Yes",
      "blessing": "Helen Voss",
      "vendors": [
        {"id": "ven-planner", "role": "Wedding planner", "name": "Avery Cole"},
        {"id": "ven-catering", "role": "Catering", "name": "Grand Hall kitchen"},
        {"id": "ven-photo", "role": "Photography", "name": "Northlight Photo"},
        {"id": "ven-video", "role": "Videography", "name": "Ridge & Reel"},
        {"id": "ven-cake", "role": "Cake", "name": "Market Street Bakery"},
        {"id": "ven-hair", "role": "Hair and makeup", "name": "Studio Lane"},
        {"id": "ven-flowers", "role": "Flowers", "name": "Ridge Bloom"}
      ],
      "requests": "Keep it classy until dinner is cleared. If a toast runs long, shorten the moonlight dance, not the first dance.",
      "timelinePdfName": "",
      "timeline": [
        {"id": "time-ceremony", "label": "Ceremony", "time": "4:30 PM", "notes": "Garden terrace. About 25 minutes."},
        {"id": "time-cocktail", "label": "Cocktail hour", "time": "5:15 PM", "notes": "Foyer. 360 is in the corner by the bar."},
        {"id": "time-intro", "label": "Introductions", "time": "6:25 PM", "notes": "Party, then the couple."},
        {"id": "time-dinner", "label": "Dinner", "time": "6:55 PM", "notes": "Blessing first."},
        {"id": "time-dance", "label": "Open dancing", "time": "8:15 PM", "notes": ""},
        {"id": "time-exit", "label": "Send-off", "time": "10:40 PM", "notes": "Sparklers at the side door."}
      ]
    },
    "booth360": {
      "enabled": true,
      "when": "Cocktail hour through dinner",
      "where": "Foyer, corner by the bar",
      "start": "5:15 PM",
      "end": "7:30 PM",
      "notes": "Props are in the black case. No flash during the blessing."
    }
  }$json$::jsonb
where not exists (select 1 from events where id = 'demo-voss-hale');
