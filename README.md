# TikTok Checker – video metadata test

Testiversio, joka hakee yhden julkisen TikTok-profiilin ja yrittää löytää profiilisivulta yhden julkisen videolinkin. Jos linkki löytyy, se avaa videon julkisen sivun ja lukee `__UNIVERSAL_DATA_FOR_REHYDRATION__` → `webapp.video-detail` → `itemInfo.itemStruct` -datan.

Region-järjestys:
1. profiilin suora `user.region`
2. videometadatan suora `locationCreated`
3. N/A

Lisätiedoissa näytetään diagnostiikkana videon HTTP-vastaus, löytyikö video-JSON, `locationCreated` sekä muut video-JSONista löytyvät region/country/locationCreated-nimiset yksinkertaiset kentät. Maata ei päätellä kielestä, biosta tai käyttäjänimestä.

Ei API-avainta eikä kolmannen osapuolen profiilipalvelua.
