# TikTok Clean Checker

Avoimen lähdekoodin TikTok-julkisten profiilitietojen tarkistin.

## Ei kolmannen osapuolen API:a

Tämä projekti EI käytä:
- TikMatrixia
- Omar-Thingia
- Apifya
- maksullista API:a
- API-avaimia

Backend hakee suoraan TikTokin julkisen profiilisivun ja lukee sivun omaan
`__UNIVERSAL_DATA_FOR_REHYDRATION__` / `SIGI_STATE` JSONiin sisältyvät julkiset tiedot.

Tyypillisiä kenttiä:
- region
- language
- nickname
- signature
- avatar
- user ID
- SecUID
- createTime
- followerCount
- followingCount
- heartCount
- videoCount

## Miksi tämä ei voi olla pelkkä GitHub Pages?

Selain ei voi luotettavasti hakea TikTokin profiilisivua suoraan CORS-rajoitusten vuoksi.
Siksi projektissa on pieni `/api/profile` serverless-funktio.

Koko koodi voi silti olla GitHubissa ja Vercelin Hobby-tasolla sitä voi ajaa
ilman erillistä maksullista API-palvelua.

## Julkaisu

### 1. GitHub

Pura ZIP ja vie KAIKKI tiedostot samaan repositoryyn.

Rakenteen pitää olla:

```
api/
  profile.js
public/
  index.html
  styles.css
  app.js
package.json
vercel.json
README.md
LICENSE
```

### 2. Vercel

1. Mene https://vercel.com/
2. Kirjaudu GitHubilla.
3. Add New -> Project.
4. Valitse tämä GitHub-repository.
5. Framework Preset: Other.
6. Deploy.

API-avaimia tai Environment Variables -asetuksia EI tarvita.

## Region-tiedon merkitys

`region` on TikTokin julkiseen profiiliobjektiin sisältyvä tilikohtainen aluekoodi,
kun TikTok sen palauttaa. Se ei ole GPS-sijainti eikä välttämättä käyttäjän
nykyinen fyysinen sijainti.

Jos TikTok ei palauta region- tai language-kenttää, sovellus näyttää N/A eikä
arvaa tietoa.

## Huomio toimintavarmuudesta

Tämä perustuu TikTokin julkisen verkkosivun rakenteeseen, joka voi muuttua.
TikTok voi myös käyttää WAF-/rate-limit-suojausta, jolloin yksittäinen haku voi
epäonnistua. Koodissa on oEmbed-fallback profiilin nimen varmistamiseen.

## Lisenssi

MIT
