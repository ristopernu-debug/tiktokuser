# TikTok Checker – direct video URL test

Vercel-versio julkisten TikTok-profiilitietojen tarkistukseen.

Uutta tässä testissä:
- käyttäjä voi antaa valinnaisesti yhden saman julkisen TikTok-tilin videon URL:n
- backend avaa videon suoraan Chromiumissa
- videon `__UNIVERSAL_DATA_FOR_REHYDRATION__` parsitaan
- näytetään `locationCreated` ja muut region/country-nimiset kentät, jos TikTok palauttaa niitä
- maata ei päätellä kielestä, biosta tai käyttäjänimestä

Jos videolinkkiä ei anneta, sovellus yrittää edelleen löytää videon automaattisesti.
