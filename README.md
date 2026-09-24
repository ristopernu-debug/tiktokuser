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


## V13 - strict region source test
- Region/language from `webapp.app-context`, session user, storeRegion, ageGateRegion, clusterRegion and TikTok environment configuration are never used as the searched profile's country.
- The primary `webapp.user-detail` object is accepted only when its `uniqueId` exactly matches the searched username.
- Post-list region is accepted only from posts tied to the searched account (matching author or matching `secUid` request).
- Video `locationCreated` is accepted only when the video metadata author exactly matches the searched username.
- Wide HTML regex fallback no longer supplies region/language values.
- Exact JSON-LD `knowsLanguage` can be used as a language fallback when its identifier/alternateName matches the searched username.
- UI label changed from Country / region to TikTok region.
- English remains the default UI language.


## V15 source trace

- More details shows the exact region source, for example `Profile metadata (user.region)` or `Video metadata (locationCreated)`.
- More details also shows the language source when available, for example `Profile metadata (user.language)` or `JSON-LD (mainEntity.knowsLanguage)`.
- Session/app-context region fields are not accepted as the searched profile region.
- The interface defaults to English on first load.


## V15 – Manual review

- Profiilikortissa on erillinen, oletuksena suljettu Manual review -tarkistuslista.
- Lista auttaa vertaamaan kuvien tekstejä, paikallisia opasteita, ympäristöä, perspektiiviä ja muuta visuaalista johdonmukaisuutta.
- Valinnat tallennetaan selaimen localStorageen käyttäjätunnuskohtaisesti.
- Lista ei tee automaattista AI- tai sijaintipäätelmää.
