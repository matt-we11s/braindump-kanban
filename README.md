# Farm Brain Dump Kanban

Mobile kanban for the **Brain Dump v.0** Google Sheet. Live at
https://matt-we11s.github.io/braindump-kanban/

## Install as a real Android app (no address bar)

The old “Add to Home screen” shortcut is a Chrome bookmark. That is why the URL bar stayed.

1. Delete the old home-screen icon.
2. Open https://matt-we11s.github.io/braindump-kanban/ in **Chrome**.
3. Tap the green **Install** banner, or Chrome **⋮ → Install app**.
4. Open the new **Farm Dump** icon. It should run fullscreen like its own app.

## Update the Google Apps Script (one-time)

This version writes a stable **Task ID** column so two tasks with similar names cannot overwrite each other, and it can actually confirm a save.

1. Open [Brain Dump v.0](https://docs.google.com/spreadsheets/d/1lZBryqVsthuQ_ZZmhHruuV6M64Ye1Fq9JnEdwwlcykg/edit).
2. **Extensions → Apps Script**.
3. Replace the code with `apps-script.js` from this repo (or use **Copy Apps Script** in the app Settings).
4. **Deploy → Manage deployments → pencil → New version → Deploy**.
5. Keep access **Anyone**. If the URL changes, paste the new `/exec` URL in Settings.

## What this build does

- Column lists scroll so every task is reachable
- Phone edits merge with the sheet instead of being wiped
- Sync reports a real success or failure
- Glove-sized status and supplies buttons
- Town Run shopping list
- Outdoor high-contrast theme (sun icon)
- Offline cache via a service worker
