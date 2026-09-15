# TikTok Checker v2

Open source -versio ilman TikMatrixia tai Omar-Thing API:a.

## Mikä muuttui?

Tavallinen server-side fetch sai TikTokin profiilitiedot, mutta ei käyttäjän videolistaa.
Region-fallback tarvitsee videolistasta `locationCreated`-kentän.

Tämä versio käyttää Vercelin serverless-funktiossa headless Chromiumia:
1. avaa oikean TikTok-profiilisivun
2. kuuntelee sivun omaa `/api/post/item_list/`-vastausta
3. lukee julkisten videoiden `locationCreated`-maakoodit
4. käyttää yleisintä maakoodia vain jos profiilin oma `region` puuttuu

Maatietoa EI päätellä kielestä, biosta tai käyttäjänimestä.

## Rakenne

api/profile.js
public/index.html
public/styles.css
public/app.js
package.json
vercel.json
README.md
LICENSE

## Vercel

GitHubiin commitoinnin jälkeen Vercel asentaa:
- puppeteer-core
- @sparticuz/chromium

Framework Preset: Other.
Environment Variables -asetuksia ei tarvita.

Ensimmäinen haku voi olla tavallista hitaampi Chromiumin cold startin vuoksi.

## Regionin merkitys

TikTok-videoiden `locationCreated` ei ole GPS-sijainti eikä todista käyttäjän nykyistä
fyysistä sijaintia. Se on TikTokin julkisessa videometadatassa oleva maakoodi.
