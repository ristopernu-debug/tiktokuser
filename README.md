# TikTok User Lookup — GitHub Pages

Valmis minimalistinen käyttöliittymä, joka hakee julkiset TikTok-käyttäjätiedot
TikMatrixin avoimesta API:sta.

## Asennus GitHubiin

Korvaa repositorion juuresta nämä tiedostot:

- `index.html`
- `styles.css`
- `app.js`

GitHub Pages päivittyy automaattisesti.

## Haku

Sovellus kutsuu:

`https://user.tikmatrix.com/api/user?username=KAYTTAJANIMI`

API ei vaadi avainta.

## Näytettävät tiedot

- profiilikuva
- nickname / käyttäjänimi
- maa
- kieli
- bio
- seuraajat
- seuratut
- tykkäykset
- videoiden määrä
- ystävät
- User ID
- SecUID
- tilin luontiaika

Maa on lähdepalvelun julkisista signaaleista tekemä arvio, ei tarkka sijainti.

## Rate limit

TikMatrix rajoittaa username-hakuja. Jos saat 503-virheen, odota hetki ja yritä uudelleen.
