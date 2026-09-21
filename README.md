# TikTok Checker - V11

Minimal public TikTok profile checker for Vercel.

## V11 changes

- English is now the default UI language for first-time visitors.
- A language explicitly selected earlier is still remembered in localStorage.
- Profile lookup is more tolerant of public accounts that have no public videos.
- Before returning "user not found", the backend now checks TikTok's full rendered HTML,
  older TikTok state containers and a public TikTok oEmbed fallback.
- If TikTok explicitly reports `videoCount: 0`, the backend skips unnecessary video
  discovery and the UI does not show the manual video-link fallback.
- No Omar-Thing API key or paid third-party API is required.
- Existing V10 visual design and the local successful-check counter are retained.

## Deploy

Replace the files in the root of the existing GitHub/Vercel project with the contents
of this package and deploy normally. No new environment variables are required.

## Note

TikTok can change its public page structure or block automated requests. The added
fallbacks reduce false "not found" results, but cannot guarantee that every public
account will always be retrievable.


## V12
- English is the default UI language even for browsers that used an older saved language preference.
- Profile parsing also searches alternate TikTok hydration branches for the exact username before falling back to limited oEmbed data.
- Missing country/language is shown as “Not available”; the app does not guess these values.
