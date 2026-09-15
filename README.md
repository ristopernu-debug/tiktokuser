# TikTok Location — valmis minimalistinen versio

Tämä projekti on tarkoitettu julkaistavaksi **Vercelissä GitHub-repositorystä**.
Frontend ja backend ovat samassa repossa.

## Mitä ohjelma tekee

- käyttäjä syöttää TikTok-käyttäjänimen
- backend tarkistaa julkisen profiilin TikTokin oEmbed-palvelusta
- jos TikTok Research API -avain on määritetty, backend hakee myös julkisen bio-kuvauksen
- ohjelma muodostaa bio-/nimivihjeistä karkean maa-arvion
- jos tietoa ei ole, ohjelma näyttää rehellisesti “Ei riittävästi tietoa”

Ohjelma ei selvitä IP-osoitetta, GPS-sijaintia, kotiosoitetta tai reaaliaikaista sijaintia.

## Miksi Vercel eikä GitHub Pages?

GitHub Pages voi julkaista vain staattisen käyttöliittymän. Tämä ohjelma tarvitsee
`/api/analyze`-backendin, joten koko GitHub-repo julkaistaan Verceliin.

## Käyttöönotto

### 1. GitHub

Lataa tämän ZIP-paketin sisältö GitHub-repositoryn juureen.

Repossa pitää näkyä ainakin:

- `api/analyze.js`
- `public/index.html`
- `public/styles.css`
- `public/app.js`
- `package.json`
- `vercel.json`

### 2. Vercel

1. Mene osoitteeseen https://vercel.com/
2. Kirjaudu GitHub-tunnuksella.
3. Valitse **Add New → Project**.
4. Valitse tämä GitHub-repository.
5. Framework Preset: **Other**
6. Paina **Deploy**.

Perusversio toimii tämän jälkeen ilman API-avainta julkisen TikTok-profiilin
olemassaolon tarkistamiseen.

### 3. TikTok Research API (valinnainen, mutta tarvitaan bioon perustuvaan automaattiseen maa-arvioon)

Jos sinulla on TikTok Research API -käyttöoikeus:

Vercel → Project → Settings → Environment Variables

Lisää:

`TIKTOK_RESEARCH_ACCESS_TOKEN`

ja arvoksi TikTok Research API -access token.

Tee sen jälkeen Redeploy.

## Tärkeä tekninen rajoitus

TikTokin normaali User Info / Display API vaatii käyttäjän oman valtuutuksen.
Research API pystyy hakemaan julkisen tilin tietoja käyttäjänimellä, mutta sen
käyttö on erikseen rajattua. Siksi mikään tavallinen GitHub Pages -sivu ei voi
luotettavasti palauttaa minkä tahansa TikTok-käyttäjän maata pelkän käyttäjänimen
perusteella.

## Paikallinen testaus

Jos Vercel CLI on asennettu:

```bash
npm install -g vercel
vercel dev
```

Avaa selaimessa Vercelin näyttämä paikallinen osoite.
