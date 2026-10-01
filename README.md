# Warband Together site

Static Astro site that renders the Warband Together co-op roadmap as
milestone lanes of status blocks. Data comes from `roadmap.json` in
https://github.com/Night1099/WarbandTogether, fetched at build time.

Live: https://warbandtogether.dev (Vercel, team Skymerx; www redirects; pushes
to `main` deploy). The deploy hook URL is kept out of git in `.env.deploy-hook`.

- `npm test`: unit and component tests (offline, fixture-based)
- `npm run build`: fetches live data; fails if the data is missing or invalid
- Refresh after a public sync: wait about 5 minutes (raw.githubusercontent.com caches files for 300 s), then trigger the Vercel deploy hook

`tests/fixtures/roadmap.json` is a snapshot; refresh it when the schema changes.
