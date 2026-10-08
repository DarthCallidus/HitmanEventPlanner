# GrokHitmanENT

Hitman Entertainment wedding desk. One event record feeds the client portal, the admin book, and Booth — the day-of run of show.

The marketing site stays on Wix at www.hitmanentertainment.net. This app is the private side, meant to live later at app.hitmanentertainment.net. Point a Client Login button on Wix at this app when the domain is ready.

## What it does

- Admin signs in, creates a wedding, and can create a client login for that wedding only.
- The couple fills the planning sections. Progress saves as they go.
- Locking an event lets them read it and stops their edits.
- Booth shows the same record: next cue, ceremony names, reception, timeline, music, notes.
- Booth keeps a copy on the phone after the wedding is opened. Day-of notes written offline sync when service returns.
- Export CSV, JSON, or a printable PDF brief from the event.

The first account created on a fresh database is the admin. Later self-serve signups are clients with no wedding until you assign one.

## Data

Schema lives in `migrations/`. Accounts and events share one Postgres database. Do not put secrets in the repo. The host injects the database and auth configuration when the app is published.

Client logins are email and password. Google and X are also available for the admin sign-in.
