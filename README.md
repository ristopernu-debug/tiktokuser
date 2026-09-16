# TikTok Checker – final

Julkisten TikTok-profiilitietojen tarkistus Vercelissä.

## Toiminta

- Hakee julkisen profiilin perustiedot TikTokin profiilisivulta.
- Näyttää `region`-arvon, jos TikTok palauttaa sen profiilidatassa.
- Yrittää automaattisesti löytää yhden julkisen videon TikTokin oman sivun verkkoliikenteestä/DOM:sta ja tarkistaa videometadatan `locationCreated`-kentän.
- Jos automaattinen videohaku ei onnistu, käyttöliittymä näyttää siistin varavaihtoehdon: käyttäjä voi liittää yhden saman tilin julkisen TikTok-videon URL:n. Tällöin `locationCreated` tarkistetaan suoraan videon julkisesta metadatasta.
- Ei päättele maata käyttäjänimestä, kielestä tai biosta.

## Vercel

1. Vie tiedostot GitHub-repositorion juureen.
2. Yhdistä repository Verceliin.
3. Vercel käyttää `vercel.json`-asetuksia ja asentaa `package.json`-riippuvuudet automaattisesti.
4. Uusi commit käynnistää uuden deployn.

## Huomio region-tiedosta

`locationCreated` on TikTokin videometadatassa palauttama kenttä. Sovellus näyttää sen TikTokin julkisena metadata-arvona eikä väitä sen olevan käyttäjän nykyinen fyysinen sijainti.
