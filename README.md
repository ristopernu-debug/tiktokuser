# TikTok Checker

Minimalistinen Vercel-sovellus julkisten TikTok-profiilitietojen tarkistukseen.

## Ominaisuudet

- Tarkka haku käyttäjätunnuksella (`@username` tai `username`).
- Nimen haku: jos syöte ei ratkea suoraan käyttäjätunnukseksi, sovellus näyttää lähimpiä julkisia käyttäjäosumia valittavaksi.
- Julkiset profiilitiedot, tilastot ja TikTokin julkisesta metadatasta saatava region-tieto.
- Jos profiilissa ei ole regionia, sovellus yrittää löytää julkisen videon ja lukea `locationCreated`-tiedon automaattisesti.
- Manuaalinen videolinkki jää varavaihtoehdoksi vain silloin, kun automaattinen region-haku ei onnistu.
- Käyttöliittymän kielivalikko: FI, EN, SV, DE, FR ja ES. Valinta tallennetaan selaimeen; ensimmäisellä käynnillä käytetään selaimen kieltä, jos se on tuettu.
- Valmiit responsiiviset mainospaikat: yläbanneri, kaksi desktop-sivupaikkaa ja alabanneri.

## Käyttöönotto

Vie paketin sisältö GitHub-repositorion juureen ja korvaa vanha versio. Jos repository on yhdistetty Verceliin, uusi commit deployataan automaattisesti.

## Huomio

TikTokin julkisten hakusivujen HTML voi muuttua. Käyttäjätunnushaku on siksi vakaampi kuin nimellä tehtävä osumahaku.
