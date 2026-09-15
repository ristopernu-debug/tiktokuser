# TikTok Checker

Open source -TikTok-profiilitarkistin ilman TikMatrixia tai maksullista profiili-API:a.

## Region-logiikka

1. Käytetään TikTokin julkisen profiilidatan `region`-kenttää, jos se löytyy.
2. Jos sitä ei ole, tarkistetaan enintään kolme julkista videota ja etsitään
   TikTokin videometadatasta `locationCreated`.
3. Jos kumpaakaan ei saada, näytetään N/A.

Maatietoa ei päätellä käyttäjänimestä, biosta tai language-kentästä.

`locationCreated` kuvaa videon TikTok-metadatassa olevaa luontialuetta. Se ei ole
käyttäjän GPS- tai reaaliaikainen sijainti.

## Julkaisu

Tämä versio tarvitsee Vercelin serverless-funktion.

Repository:

api/profile.js
public/index.html
public/styles.css
public/app.js
package.json
vercel.json

Vercel:
- Framework Preset: Other
- API-avaimia ei tarvita.
