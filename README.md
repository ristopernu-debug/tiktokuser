# TikTok Public Account Checker

Avoimen lähdekoodin, täysin staattinen GitHub Pages -sovellus TikTokin julkisten
profiilitietojen tarkistamiseen.

## Ominaisuudet

- profiilikuva
- näyttönimi ja käyttäjänimi
- maa
- kieli
- bio
- seuraajat, seuratut, tykkäykset ja videot
- User ID, SecUID, tilin luontiaika ja ystävien määrä
- suora linkki TikTok-profiiliin
- lähdemerkintä
- ei API-avainta
- ei käyttäjätietojen tallennusta

## Tietolähde

Sovellus käyttää TikMatrixin avointa endpointia:

`https://user.tikmatrix.com/api/user?username=KAYTTAJANIMI`

TikMatrixin dokumentaation mukaan endpointit tukevat CORSia eikä API-avainta tarvita.

## Active Region

TikMatrixin dokumentaatio mainitsee `/api/region`-endpointin ja sille
3 pyyntöä/minuutti -rajan, mutta tällä hetkellä dokumentaatiossa ei julkaista sen
pyyntöparametreja tai vastausmuotoa. Sovellus ei siksi arvaa Active Region -arvoa.

Kun endpointin käyttö dokumentoidaan luotettavasti, sen voi lisätä ilman että
käyttöliittymää tarvitsee rakentaa uudelleen.

## GitHub Pages

Repositorion juureen tarvitaan:

- `index.html`
- `styles.css`
- `app.js`
- `README.md`
- `LICENSE`

Settings → Pages:

- Source: Deploy from a branch
- Branch: main
- Folder: /(root)

## Tietosuoja ja tulkinta

Maa- tai kielitieto ei osoita käyttäjän fyysistä tai reaaliaikaista sijaintia.
Niitä ei pidä käyttää yksin päätelmänä käyttäjän henkilöllisyydestä tai
luotettavuudesta.

## Lisenssi

MIT
