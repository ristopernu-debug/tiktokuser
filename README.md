# TikTok Checker – integrated browser-response test

Tämä versio hakee julkisen TikTok-profiilin Vercelissä ajettavalla Chromiumilla.

Uusi ensisijainen videotietojen reitti:

1. Response-listener asetetaan ennen profiilisivun avaamista.
2. TikTok-profiili avataan oikeassa Chromium-selaimessa.
3. Sovellus odottaa TikTokin oman frontendin tekemää `/api/post/item_list/`-verkkovastausta.
4. Jos vastaus sisältää `itemList`-videot, ensimmäisestä videosta tarkistetaan `locationCreated` ja muut region/country-kentät.
5. Jos videon URL saadaan, myös videon `__UNIVERSAL_DATA_FOR_REHYDRATION__` / `webapp.video-detail` tarkistetaan.
6. Jos TikTokin sivu ei tee post-listapyyntöä, sovellus kokeilee vain diagnostisena fallbackina sivukontekstin fetch-kutsua.

Sovellus ei arvaa maata kielestä, biosta tai käyttäjänimestä. Maa/region näytetään vain, jos TikTokin palauttamasta datasta löytyy kaksikirjaiminen region-arvo.

## Vercel

Projektin juuressa ovat `package.json`, `vercel.json`, `api/` ja `public/`. Korvaa GitHub-repon nykyiset tiedostot tämän paketin vastaavilla tiedostoilla ja anna Vercelin deployata.
