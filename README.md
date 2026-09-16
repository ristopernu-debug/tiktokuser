# TikTok Checker – final

Julkisten TikTok-profiilitietojen tarkistus Vercelissä.

## Toiminta

- Hakee julkisen TikTok-profiilin perustiedot.
- Näyttää maan/regionin vain, jos TikTok palauttaa region-tiedon julkisessa metadatassa.
- Jos profiilista ei löydy regionia, sovellus yrittää automaattisesti löytää saman tilin julkisen videon profiilisivulta ja tarkistaa videometadatan `locationCreated`-kentän.
- Automaattinen videonhaku käyttää ensin TikTokin oman sivun post-listavastausta ja sen jälkeen profiilisivun julkisia videolinkkejä.
- Jos automaattinen haku ei löydä videota tai regionia, käyttäjä voi liittää saman tilin yhden julkisen TikTok-videon URL:n varatarkistusta varten.
- Ei päättele maata käyttäjänimestä, kielestä tai biosta.
- Ei käytä TikMatrixia, Omar-Thing API:a tai API-avaimia.

## Käyttöönotto

Vie tämän paketin tiedostot GitHub-repositorion juureen ja korvaa vanhat versiot. Verceliin yhdistetty repository deployataan uuden commitin jälkeen automaattisesti.

## Region-tiedon merkitys

TikTokin region- tai `locationCreated`-metadata ei tarkoita käyttäjän nykyistä fyysistä sijaintia.
